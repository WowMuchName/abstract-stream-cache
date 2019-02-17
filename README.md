# Abstract-Stream-Cache
[![Build Status](https://travis-ci.org/WowMuchName/abstract-stream-cache.svg?branch=master)](https://travis-ci.org/WowMuchName/abstract-stream-cache)
[![Known Vulnerabilities](https://snyk.io/test/github/WowMuchName/abstract-stream-cache/badge.svg?targetFile=package.json)](https://snyk.io/test/github/WowMuchName/abstract-stream-cache?targetFile=package.json)
[![Test Coverage](https://api.codeclimate.com/v1/badges/fbc64ce6fcfe79f6a6a7/test_coverage)](https://codeclimate.com/github/WowMuchName/abstract-stream-cache/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/fbc64ce6fcfe79f6a6a7/maintainability)](https://codeclimate.com/github/WowMuchName/abstract-stream-cache/maintainability)
[![Dependencies](https://david-dm.org/WowMuchName/abstract-stream-cache.svg)](https://david-dm.org/WowMuchName/abstract-stream-cache#info=dependencies)
[![NPM](https://nodei.co/npm/abstract-stream-cache.png?compact=true)](https://nodei.co/npm/abstract-stream-cache/)

Provides utilities for creating Stream-Caches for javascript and typescript projects.

## WritablePatch
Used to modify nodejs' [writable](https://nodejs.org/dist/latest-v8.x/docs/api/stream.html#stream_class_stream_writable).

### InterceptWritable
Takes any WritableStream and **redirects** received data into an Rx-Observable. No data is received by the original target.

```
            Rx-Observable
                  ^
                  |
WritableStream ---+     Target
```

```ts
let observable: Observable<Buffer> = interceptWritable(writable);
```

### MapWritable
Takes any WritableStream and **forks** received data into an Rx-Observable. The data is still received by the original target.
```
            Rx-Observable
                  ^
                  |
WritableStream ---+---> Target
```

The modules can be used in *chunked* and *unchunked* mode. In *chunked* mode, every time data is written to the stream, the observable and original target receive this data part. In *unchunked* mode the written data is collected in memory (using BufferBuilder) until the stream is ended. The observable and original target receive all the data as one buffer at this point.

```ts
// Chunked mode
let observable: Observable<Buffer> = mapWritable(writable, true);

// Unchunked mode
let observable: Observable<Buffer> = mapWritable(writable, false);
```

## Cache
Provides an abstract base for general purpose caches.
The cache has two generic Type-Arguments, *(K)ey* and *(R)equest*. *Request* is the object type the cache receives and needs to create
data for. An example could be a Express-Request. *Key* is the primitive id that identifies the data. And example could be a request's url.

The cache needs 4 arguments to be created:
```ts
cache({
    keyExtractor,
    streamExtractor,
    producer,
    cacheBackend,
});
```

### KeyExtractor
Takes a Request and generates a Key for it. It method **must** be deterministic.

### StreamExtractor
Takes a Request and returns a Writable that represents the target for the data to create.

### Producer
Producer for the data if it is not found in the cache.

### CacheBackend
Backend where data is cached to.
A file backend is provided with this package.
