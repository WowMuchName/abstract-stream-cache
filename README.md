# Abstract-Stream-Cache
Provides utilities for creating Stream-Caches for javascript and typescript projects.

## BufferBuilder
Provides miscellaneous methods for working with buffers

### Merging buffers
Buffers and strings can be merged into a buffer using the *append* method.
It supports the same parameter-types as the buffer-constructor.

```ts
let bufferBuilder: BufferBuilder = new BufferBuilder();

bufferBuilder.append(new Buffer("Any Buffer"));
bufferBuilder.append("Any String");
bufferBuilder.append("Any Èncoding", "latin1");

let mergedBuffer: Buffer = bufferBuilder.getBuffer();
```

### isBuffer
Utility method that detects buffers.

```js
// Detect buffers
assert.isTrue(BufferBuilder.isBuffer(new Buffer("")));

// ... and nothing else
assert.isTrue(!BufferBuilder.isBuffer({}));
assert.isTrue(!BufferBuilder.isBuffer(1));
assert.isTrue(!BufferBuilder.isBuffer("1"));
assert.isTrue(!BufferBuilder.isBuffer(undefined));
assert.isTrue(!BufferBuilder.isBuffer(null));
assert.isTrue(!BufferBuilder.isBuffer([]));
assert.isTrue(!BufferBuilder.isBuffer(() => {}));
```

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
