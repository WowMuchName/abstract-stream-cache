import {FileStreamCacheBackend} from "./../lib/FileCache";
import {
    assert,
} from "chai";
import {
    createWriteStream,
    mkdirSync,
    readFileSync,
} from "fs";
import {
    sync,
} from "rimraf";
try {
    mkdirSync("temp");
} catch(e) {
}
try {
    mkdirSync("temp/cache");
} catch(e) {
}

describe("FileStreamCacheBackend", () => {
    describe("#putStreaming", () => {
        it("should be possible to put a cache-item", (done) => {
            const fc: FileStreamCacheBackend<string> = new FileStreamCacheBackend("temp/cache");
            fc.putStreaming("test1").then((writable) => {
                writable.end("Test1: HelloWorld!", () => done());
            });
        });
        it("should have create the output file", () => {
            assert.deepEqual(readFileSync("temp/cache/InRlc3QxIg=="), Buffer.from("Test1: HelloWorld!"));
        });
        it("should be possible to put a cache-item again", () => {
            const fc: FileStreamCacheBackend<string> = new FileStreamCacheBackend("temp/cache");
            return fc.putStreaming("test1").then((writable) => {
                writable.end("Test1: HelloWorld!");
            });
        });
    });
    describe("#getSteaming", () => {
        it("should be possible to read a cache item", () => {
            const fc: FileStreamCacheBackend<string> = new FileStreamCacheBackend("temp/cache");
            return fc.getSteaming("test1", createWriteStream("temp/test1-copy")).then((success) => {
                assert.isTrue(success);
            });
        });
        it("should not be possible to read a cache item that doesn't exist", () => {
            const fc: FileStreamCacheBackend<string> = new FileStreamCacheBackend("temp/cache");
            return fc.getSteaming("test2", createWriteStream("temp/test2-copy")).then((success) => {
                assert.isTrue(!success);
            });
        });
    });
    describe("#expunge", () => {
        it("should be possible to expunge a cache item", () => {
            const fc: FileStreamCacheBackend<string> = new FileStreamCacheBackend("temp/cache");
            return fc.expunge("test1").then((success) => {
                assert.isTrue(success);
            });
        });
        it("should not be possible to expunge a cache item that does not exist", () => {
            const fc: FileStreamCacheBackend<string> = new FileStreamCacheBackend("temp/cache");
            return fc.expunge("test2").then((success) => {
                assert.isTrue(!success);
            });
        });
        it("should not be possible to read a cache item that was expunged", () => {
            const fc: FileStreamCacheBackend<string> = new FileStreamCacheBackend("temp/cache");
            return fc.getSteaming("test1", createWriteStream("temp/test1-copy2")).then((success) => {
                assert.isTrue(!success);
            });
        });
    });
    describe("#iterator", () => {
        it("should be possible to iterate over files", (done) => {
            const fc: FileStreamCacheBackend<string> = new FileStreamCacheBackend("temp/cache");
            fc.putStreaming("test1").then((writable) => {
                writable.end("Test1: HelloWorld!", () => {
                    let count = 0;
                    for (const f of fc) {
                        count++;
                        assert.equal(f.key, "test1");
                        assert.equal(f.size, 18);
                    }
                    assert.equal(count, 1);
                });
                done();
            });
        });
    });
});
