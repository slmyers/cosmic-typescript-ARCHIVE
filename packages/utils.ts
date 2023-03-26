// wrap a promise with a timeout
export function timeoutPromise<T>(
    promise: Promise<T>,
    timeout: number,
): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('timeout'));
        }, timeout);
        promise
            .then((result) => {
                clearTimeout(timer);
                resolve(result);
            })
            .catch((error) => {
                clearTimeout(timer);
                reject(error);
            });
    });
}
