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
import {
    Observable,
} from "rxjs";
import {
    interceptWritable,
    mapWritable,
} from "../lib/WritablePatch";

interface IRxResult<T> {
    isError: boolean;
    error?: any;
    result?: T;
}

function result<T>(value: T): IRxResult<T> {
    return  {
        isError: false,
        result: value,
    };
}

function error(err: any): IRxResult<any> {
    return  {
        error: err,
        isError: true,
    };
}

function testObservable < T > (observable: Observable < T > , tokens: Array<IRxResult<T>>): Promise < void > {
    return new Promise((res, rej) => {
        let i = 0;
        observable.subscribe(
            (next) => {
                if (i > tokens.length) {
                    rej("Received more next-item than expected");
                } else if (tokens[i].isError) {
                    rej(`Expected an error as item ${i}`);
                } else {
                    try {
                        assert.deepEqual(next, tokens[i++].result);
                    } catch (err) {
                        rej(err);
                    }
                }
            },
            (err) => {
                if (i > tokens.length) {
                    rej("Received more next-item than expected");
                } else if (!tokens[i].isError) {
                    rej(`Did not expected an error as item ${i}`);
                } else {
                    try {
                        assert.equal(err, tokens[i++].error);
                        res();
                    } catch (e) {
                        rej(e);
                    }
                }
            },
            () => {
                if (i !== tokens.length) {
                    rej(`Received less next-items than expected ${i}/${tokens.length}`);
                } else {
                    res();
                }
            },
        );
    });
}
try {
    mkdirSync("temp");
} catch(e){
    
}

describe("WritablePath", function () {
    describe("interceptWritable", () => {
        it("should forward the buffers to the observable", () => {
            const ws = createWriteStream("temp/testfile.txt");
            const res: Promise<void> = testObservable(interceptWritable(ws), [
                result(new Buffer("Hello")),
                result(new Buffer(" World")),
                result(new Buffer("!")),
            ]);
            ws.write("Hello");
            ws.write(new Buffer(" World"));
            ws.end("!");
            return res;
        });
        it("should support different encodings", () => {
            const ws = createWriteStream("temp/testfile.txt");
            const res: Promise<void> = testObservable(interceptWritable(ws), [
                result(new Buffer("ÄÖÜ")),
            ]);
            ws.write(new Buffer("ÄÖÜ", "utf8").toString("latin1"), "latin1");
            ws.end();
            return res;
        });
        it("should invoke the callbacks (I/V)", () => {
            const ws = createWriteStream("temp/testfile.txt");
            const res: Promise<void> = testObservable(interceptWritable(ws), [
                result(new Buffer("A")),
                result(new Buffer("B")),
            ]);
            let doneA = false;
            let doneB = false;
            let doneC = false;
            ws.write(new Buffer("A"), () => {
                doneA = true;
            });
            ws.write("B", () => {
                doneB = true;
            });
            ws.end(() => {
                doneC = true;
            });
            return res.then(() => {
                assert.isTrue(doneA);
                assert.isTrue(doneB);
                assert.isTrue(doneC);
            });
        });
        it("should invoke the callbacks (II/V)", () => {
            const ws = createWriteStream("temp/testfile.txt");
            const res: Promise<void> = testObservable(interceptWritable(ws), [
                result(new Buffer("A")),
            ]);
            let doneA = false;
            ws.end("A", () => {
                doneA = true;
            });
            return res.then(() => assert.isTrue(doneA));
        });
        it("should invoke the callbacks (III/V)", () => {
            const ws = createWriteStream("temp/testfile.txt");
            const res: Promise<void> = testObservable(interceptWritable(ws), [
                result(new Buffer("A")),
            ]);
            let doneA = false;
            ws.end(new Buffer("A"), () => {
                doneA = true;
            });
            return res.then(() => assert.isTrue(doneA));
        });
        it("should invoke the callbacks (IV/V)", () => {
            const ws = createWriteStream("temp/testfile.txt");
            const res: Promise<void> = testObservable(interceptWritable(ws), [
                result(new Buffer("A")),
            ]);
            let doneA = false;
            ws.end("A", "utf8", () => {
                doneA = true;
            });
            return res.then(() => assert.isTrue(doneA));
        });
        it("should invoke the callbacks (V/V)", () => {
            const ws = createWriteStream("temp/testfile.txt");
            const res: Promise<void> = testObservable(interceptWritable(ws), [
                result(new Buffer("A")),
            ]);
            let doneA = false;
            ws.write("A", "utf8", () => {
                doneA = true;
            });
            ws.end();
            return res.then(() => assert.isTrue(doneA));
        });
        it("should forward errors in write", () => {
            const ws = createWriteStream("temp/testfile.txt");
            const res: Promise<void> = testObservable(interceptWritable(ws), [
                error("TypeError: Cannot read property 'toString' of undefined"),
            ]);
            (ws.write as any)();
            return res;
        });
        it("should forward errors in end", () => {
            const ws = createWriteStream("temp/testfile.txt");
            const res: Promise<void> = testObservable(interceptWritable(ws), [
                error("TypeError: Cannot read property 'toString' of null"),
            ]);
            ws.end(null);
            return res;
        });
    });
    describe("mapWritable", () => {
        it("should forward the buffers to the observable in chunked mode", () => {
            const ws = createWriteStream("temp/testfile2.txt");
            const res: Promise<void> = testObservable(mapWritable(ws, true), [
                result(new Buffer("Hello")),
                result(new Buffer(" World")),
                result(new Buffer("!")),
            ]);
            ws.write("Hello");
            ws.write(new Buffer(" World"));
            ws.end("!");
            return res;
        });
        it("should have create the output file for chunked mode", () => {
            assert.deepEqual(readFileSync("temp/testfile2.txt"), new Buffer("Hello World!"));
        });
        it("should forward the buffers to the observable in unchunked mode", () => {
            const ws = createWriteStream("temp/testfile3.txt");
            const res: Promise<void> = testObservable(mapWritable(ws), [
                result(new Buffer("Hello World!")),
            ]);
            ws.write("Hello");
            ws.write(new Buffer(" World"));
            ws.end("!");
            return res;
        });
        it("should have create the output file for unchunked mode", () => {
            assert.deepEqual(readFileSync("temp/testfile3.txt"), new Buffer("Hello World!"));
        });
        it("should forward errors in end when in unchunked mode", () => {
            const ws = createWriteStream("temp/testfile.txt");
            const res: Promise<void> = testObservable(mapWritable(ws), [
                error("TypeError: Cannot read property 'toString' of null"),
            ]);
            ws.end(null);
            return res;
        });
        it("should forward errors in write in unchunked mode", () => {
            const ws = createWriteStream("temp/testfile.txt");
            const res: Promise<void> = testObservable(mapWritable(ws), [
                error("TypeError: Cannot read property 'toString' of undefined"),
            ]);
            (ws.write as any)();
            return res;
        });
        it("should forward errors in end when in unchunked mode", () => {
            const ws = createWriteStream("temp/testfile.txt");
            const res: Promise<void> = testObservable(mapWritable(ws, true), [
                error("TypeError: Cannot read property 'toString' of null"),
            ]);
            ws.end(null);
            return res;
        });
        it("should forward errors in write in unchunked mode", () => {
            const ws = createWriteStream("temp/testfile.txt");
            const res: Promise<void> = testObservable(mapWritable(ws, true), [
                error("TypeError: Cannot read property 'toString' of undefined"),
            ]);
            (ws.write as any)();
            return res;
        });
    });
});
