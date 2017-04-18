import * as fs from 'fs-promise';
import * as uuid from 'uuid';
import { spawn } from './spawn';

interface Config {
    GIT_USER_EMAIL: string;
    GIT_USER_NAME: string;
    GIT_OUTPUT_REPO: string;
}

export default async function run(action: () => Promise<void>) {
    const outputFolder = `output.${uuid()}`;
    await fs.ensureDir(outputFolder);
    process.chdir(outputFolder);

    const config = process.env as Config;

    await spawn('git', ['clone', config.GIT_OUTPUT_REPO, '.', '--depth=1', '--no-checkout']);

    await spawn('git', ['config', 'user.email', config.GIT_USER_EMAIL]);
    await spawn('git', ['config', 'user.name', config.GIT_USER_NAME]);

    await action();

    await spawn('git', ['add', '-A']);
    await spawn('git', ['commit', '-m', 'automatic update']);
    await spawn('git', ['push']);
}
