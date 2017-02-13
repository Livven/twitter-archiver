import * as fs from 'fs-promise';
import * as path from 'path';
import { AuthOptions } from 'request';
import * as request from 'request-promise';

interface Config {
    TWITTER_API_KEY: string;
    TWITTER_API_SECRET: string;
    TWITTER_USERNAME: string;
}

class TwitterClient {
    private readonly auth: AuthOptions;

    private constructor(public readonly token: string) {
        this.auth = {
            bearer: token,
        };
    }

    public static async create(key: string, secret: string) {
        const json = await request.post(`https://${encodeURIComponent(key)}:${encodeURIComponent(secret)}@api.twitter.com/oauth2/token`, {
            form: {
                grant_type: 'client_credentials',
            },
            json: true,
        });
        return new TwitterClient(json['access_token']);
    }

    public async getUserIds(type: string, user: string) {
        const result = [] as number[];
        let cursor = -1;
        do {
            const json = await this.getUserIdsCore(type, user, cursor);
            const ids = json['ids'] as number[];
            result.push(...ids);
            cursor = json['next_cursor'];
        } while (cursor > 0);
        // clear out potential duplicates from cursor boundaries
        return [...new Set(result)];
    }

    public async getUsers(ids: number[]) {
        const limit = 100;
        const result = new Map<number, any>();
        ids = [...new Set(ids)];
        for (let i = 0; i < ids.length; i += limit) {
            const partialIds = ids.slice(i, i + limit);
            const partialResult = await this.getUsersCore(partialIds);
            for (const item of partialResult) {
                result.set(item['id'], item);
            }
        }
        return result;
    }

    private async getUserIdsCore(type: string, user: string, cursor: number) {
        const limit = 5000;
        const json = await request.get(`https://api.twitter.com/1.1/${type}/ids.json`, {
            auth: this.auth,
            qs: {
                screen_name: user,
                count: limit,
                cursor: cursor,
            },
            json: true,
        });
        return json;
    }

    private async getUsersCore(ids: number[]) {
        const json = await request.get('https://api.twitter.com/1.1/users/lookup.json', {
            auth: this.auth,
            qs: {
                user_id: ids.join(','),
            },
            json: true,
        });
        return json;
    }
}

async function main() {
    const config = process.env as Config;
    const client = await TwitterClient.create(config.TWITTER_API_KEY, config.TWITTER_API_SECRET);
    const followerIds = await client.getUserIds('followers', config.TWITTER_USERNAME);
    const followingIds = await client.getUserIds('friends', config.TWITTER_USERNAME);
    const users = await client.getUsers([...followerIds, ...followingIds]);
    await writeList('followers', followerIds, users);
    await writeList('following', followingIds, users);
    await writeUsers(users);
}

async function writeList(name: string, ids: number[], users: Map<number, any>) {
    const list = ids.map(id => getName(users, id));
    const result = {
        count: list.length,
        users: list,
    };
    await fs.writeJson(`${name}.json`, result);
}

async function writeUsers(users: Map<number, any>) {
    const folder = 'users';
    await fs.ensureDir(folder);
    for (const user of users.values()) {
        await fs.writeJson(path.join(folder, `${user['screen_name']}.json`), user);
    }
}

function getName(users: Map<number, any>, id: number) {
    const user = users.get(id);
    return user ? `${user['name']} (${user['screen_name']})` : id;
}

main();
