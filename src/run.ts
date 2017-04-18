import * as fs from 'fs-promise';
import * as uuid from 'uuid';
import { execFile } from './exec';

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

    await execFile('git', ['clone', config.GIT_OUTPUT_REPO, '.', '--depth=1', '--no-checkout']);

    await execFile('git', ['config', 'user.email', config.GIT_USER_EMAIL]);
    await execFile('git', ['config', 'user.name', config.GIT_USER_NAME]);

    await action();

    await execFile('git', ['add', '-A']);
    await execFile('git', ['commit', '-m', 'automatic update']);
    await execFile('git', ['push']);
}
