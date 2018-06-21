import {Writable} from "stream";
import {mapWritable} from "./WritablePatch";

export interface IStreamCache<R, K> extends Iterable<ICacheItem<K>> {
    expire(key: K): Promise<boolean>;
    get(req: R): Promise<K>;
}

export interface IStreamCacheOptions<R, K> {
    keyExtractor: KeyExtractor<R, K>;
    streamExtractor: StreamExtractor<R>;
    cacheBackend: IStreamCacheBackend<K>;
    producer: StreamProducer<R>;
}

export interface ICacheItem<K> {
    readonly key: K;
    readonly lastAccess: Date;
    readonly size: number;
}

export type StreamProducer<R> = (req: R, stream: Writable) => void;
export type KeyExtractor<R, K> = (req: R) => K;
export type StreamExtractor<R> = (req: R) => Writable;

export interface IStreamCacheBackend<K> extends Iterable<ICacheItem<K>> {
    putStreaming(key: K): Promise<Writable>;
    getSteaming(key: K, output: Writable): Promise<boolean>;
    expunge(key: K): Promise<boolean>;
}

export function cache<R, K>(options: IStreamCacheOptions<R, K>): IStreamCache<R, K> {
    return {
        [Symbol.iterator]: () => options.cacheBackend[Symbol.iterator](),
        expire(key: K): Promise<boolean> {
            return options.cacheBackend.expunge(key);
        },
        get(req: R): Promise<K> {
            const stream: Writable = options.streamExtractor(req);
            const key: K = options.keyExtractor(req);
            return options.cacheBackend.getSteaming(key, stream).then((success) => {
                if (success) {
                    return Promise.resolve<K>(key);
                }
                return new Promise<K>((res, rej) =>
                    options.cacheBackend.putStreaming(key).then((cacheStream) => {
                        mapWritable(stream).subscribe(
                            (chunk) => cacheStream.write(chunk),
                            (err) => rej(err),
                            () => {
                                cacheStream.end(() => {
                                    res(key);
                                });
                            },
                        );
                        options.producer(req, stream);
                    }));
            });
        },
    };
}
