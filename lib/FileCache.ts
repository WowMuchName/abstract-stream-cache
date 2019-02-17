import {createReadStream, createWriteStream, open, readdirSync, ReadStream, Stats, statSync, unlink} from "fs";
import {join} from "path";
import {Writable} from "stream";
import {ICacheItem, IStreamCacheBackend} from "./Cache";

export interface IStringDecoder<K> {
    asString(key: K): string;
    asKey(str: string): K;
}

export class FileStreamCacheBackend<K> implements IStreamCacheBackend<K> {
    private decoder: IStringDecoder<K>;

    constructor(private rootPath: string, decoder?: IStringDecoder<K>) {
        this.decoder = decoder || {
            asString(key: K): string {
                return Buffer.from(JSON.stringify(key)).toString("base64").replace("/", "_");
            },
            asKey(str: string): K {
                return JSON.parse(Buffer.from(str.replace("_", "/"), "base64").toString("utf8"));
            },
        };
    }

    public putStreaming(key: K): Promise<Writable> {
        return Promise.resolve(createWriteStream(this.getPath(key)));
    }

    public getSteaming(key: K, output: Writable): Promise<boolean> {
        return new Promise((res, rej) => {
            open(this.getPath(key), "r", (err, fd) => {
                if (err) {
                    if (err.code === "ENOENT") {
                        res(false);
                    } else {
                        rej(err);
                    }
                } else {
                    const readStream: ReadStream = createReadStream("ignored", {
                        fd,
                    });
                    readStream.pipe(output, {
                        end: true,
                    });
                    output.on("finish", () => {
                        res(true);
                    });
                }
            });
        });
    }

    public expunge(key: K): Promise<boolean> {
        return new Promise<boolean>((res, rej) => {
            unlink(this.getPath(key), (err) => {
                if (err) {
                    if (err.code === "ENOENT") {
                        res(false);
                    } else {
                        rej(err);
                    }
                } else {
                    res(true);
                }
            });
        });
    }

    public [Symbol.iterator](): Iterator<ICacheItem<K>> {
        const files: string[] = readdirSync(this.rootPath);
        let fileIndex: number = 0;
        const that  = this;
        const iter: Iterator<ICacheItem<K>> = {
            next(value?: any): IteratorResult<ICacheItem<K>> {
                if (fileIndex >= files.length) {
                    return {
                        done: true,
                        value: undefined as any,
                    };
                }
                const stats: Stats = statSync(join(that.rootPath, files[fileIndex]));
                return {
                    done: false,
                    value: ({
                        key: that.decoder.asKey(files[fileIndex++]),
                        lastAccess: stats.atime,
                        size: stats.size,
                    } as any),
                };
            },
        };
        return iter;
    }

    private getPath(key: K): string {
        return join(this.rootPath, this.decoder.asString(key));
    }
}
