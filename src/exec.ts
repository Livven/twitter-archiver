import * as child_process from 'child_process';

export function exec(command: string) {
    return wrapChildProcess(child_process.exec(command));
}

export function execFile(command: string, args?: string[]) {
    return wrapChildProcess(child_process.execFile(command, args));
}

function wrapChildProcess(childProcess: child_process.ChildProcess): Promise<child_process.ChildProcess> {
    return new Promise((resolve, reject) => {
        childProcess.stdout.pipe(process.stdout);
        childProcess.stderr.pipe(process.stderr);
        childProcess.on('exit', (code, signal) => {
            if (code === 0) {
                resolve(childProcess);
            } else {
                reject(new Error(`${code}: ${signal}`));
            }
        });
    });
}
