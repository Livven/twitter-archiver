import { execFileSync } from 'child_process';
import * as fs from 'fs-promise';
import * as uuid from 'uuid';

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

    execFileSync('git', ['clone', config.GIT_OUTPUT_REPO, '.', '--depth=1', '--no-checkout']);

    execFileSync('git', ['config', 'user.email', config.GIT_USER_EMAIL]);
    execFileSync('git', ['config', 'user.name', config.GIT_USER_NAME]);

    await action();

    execFileSync('git', ['add', '-A']);
    execFileSync('git', ['commit', '-m', 'automatic update']);
    execFileSync('git', ['push']);
}
