import {
    assert,
} from "chai";
import {createReadStream, createWriteStream, mkdirSync, unlinkSync, writeFile, writeFileSync} from "fs";
import { Writable } from "stream";
import {cache, IStreamCache} from "./../lib/Cache";
import {FileStreamCacheBackend} from "./../lib/FileCache";

interface TestRequest {
    key: string;
    infile: string;
    outfile: string;
}

const c: IStreamCache<TestRequest, string> = cache({
    cacheBackend: new FileStreamCacheBackend<string>("temp/cache2"),
    keyExtractor: (x: TestRequest) => x.key,
    producer: (req: TestRequest, x: Writable) => createReadStream(req.infile).pipe(x, {
        end: true,
    }),
    streamExtractor: (x: TestRequest) => createWriteStream(x.outfile),
});

// beforeEach((done) => {
//    sync("temp/cache/*");
//    sync("temp/cache");
//    sync("temp/*");
//    sync("temp");
try {
    mkdirSync("temp");
} catch (e) {
}
try {
    mkdirSync("temp/cache2");
} catch (e) {
}
writeFileSync("temp/file1in", Buffer.from("Hello World"));
//    done();
// });

describe("IStreamCache", () => {
    describe("#get", () => {
        it("should be possible to request a item that is not cached yet", () => {
            return c.get({
                key: "file1",
                infile: "temp/file1in",
                outfile: "temp/file1out",
            });
        });
        it("should be possible to request a item that is cached", () => {
            unlinkSync("temp/file1in");
            return c.get({
                key: "file1",
                infile: "temp/file1in",
                outfile: "temp/file1out",
            });
        });
    });
    describe("#iterator", () => {
        it("", (done) => {
            let count = 0;
            for (const f of c) {
                count++;
                assert.equal(f.key, "file1");
                assert.equal(f.size, 11);
            }
            assert.equal(count, 1);
            done();
        });
    });
});
