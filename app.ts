import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs-promise';
import * as path from 'path';

interface Config {
    TWITTER_API_KEY: string;
    TWITTER_API_SECRET: string;
    TWITTER_USERNAME: string;
}

class TwitterClient {
    private axios: AxiosInstance;

    private constructor(public readonly token: string) {
        this.axios = axios.create({
            baseURL: 'https://api.twitter.com/1.1/',
            headers: {
                Authorization: `bearer ${token}`,
            },
        });
    }

    public static async create(key: string, secret: string) {
        const response = await axios.post('https://api.twitter.com/oauth2/token', 'grant_type=client_credentials', {
            auth: {
                username: encodeURIComponent(key),
                password: encodeURIComponent(secret),
            },
        });
        return new TwitterClient(response.data['access_token']);
    }

    public async getUserIds(type: string, user: string) {
        const result = [] as string[];
        let cursor = -1;
        do {
            const json = await this.getUserIdsCore(type, user, cursor);
            const ids = json['ids'] as string[];
            result.push(...ids);
            cursor = json['next_cursor'];
        } while (cursor > 0);
        // clear out potential duplicates from cursor boundaries
        return [...new Set(result)];
    }

    public async getUser(name: string) {
        const response = await this.axios.get('users/show.json', {
            params: {
                screen_name: name,
            },
        });
        return response.data;
    }

    public async getUsers(ids: string[]) {
        const limit = 100;
        const result = new Map<string, any>();
        ids = [...new Set(ids)];
        for (let i = 0; i < ids.length; i += limit) {
            const partialIds = ids.slice(i, i + limit);
            const partialResult = await this.getUsersCore(partialIds);
            for (const item of partialResult) {
                result.set(item['id_str'], item);
            }
        }
        return result;
    }

    private async getUserIdsCore(type: string, user: string, cursor: number) {
        const limit = 5000;
        const response = await this.axios.get(`${type}/ids.json`, {
            params: {
                screen_name: user,
                count: limit,
                cursor: cursor,
                // necessary for handling large ids
                stringify_ids: true,
            },
        });
        return response.data;
    }

    private async getUsersCore(ids: string[]) {
        const response = await this.axios.get('users/lookup.json', {
            params: {
                user_id: ids.join(','),
            },
        });
        return response.data;
    }
}

async function main() {
    const config = process.env as Config;
    const client = await TwitterClient.create(config.TWITTER_API_KEY, config.TWITTER_API_SECRET);
    const me = await client.getUser(config.TWITTER_USERNAME);
    const followerIds = await client.getUserIds('followers', config.TWITTER_USERNAME);
    const followingIds = await client.getUserIds('friends', config.TWITTER_USERNAME);
    const users = await client.getUsers([...followerIds, ...followingIds]);
    formatUser(me);
    users.forEach(formatUser);
    await fs.writeJson('me.json', me);
    await writeList('followers', followerIds, users);
    await writeList('following', followingIds, users);
    await writeUsers(users);
}

async function writeList(name: string, ids: string[], users: Map<string, any>) {
    const list = ids.map(id => getName(users, id));
    const result = {
        count: list.length,
        users: list,
    };
    await fs.writeJson(`${name}.json`, result);
}

async function writeUsers(users: Map<string, any>) {
    const folder = 'users';
    await fs.ensureDir(folder);
    for (const user of users.values()) {
        await fs.writeJson(path.join(folder, `${user['screen_name']}.json`), user);
    }
}

function getName(users: Map<string, any>, id: string) {
    const user = users.get(id);
    return user ? `${user['name']} (${user['screen_name']})` : id;
}

function formatUser(user: any) {
    const entities = user['entities'];
    for (const property of Object.keys(entities)) {
        for (const urlEntity of entities[property]['urls']) {
            const value = user[property] as string;
            user[property] = value.replace(urlEntity['url'], urlEntity['expanded_url']);
        }
    }
    delete user['entities'];
    delete user['status'];
}

main();
