import * as child_process from 'child_process';

export function spawn(command: string, args?: string[]): Promise<child_process.ChildProcess> {
    return new Promise((resolve, reject) => {
        const childProcess = child_process.spawn(command, args, { stdio: 'inherit' });
        childProcess.on('exit', (code, signal) => {
            if (code === 0) {
                resolve(childProcess);
            } else {
                reject(new Error(`${code}: ${signal}`));
            }
        });
    });
}
