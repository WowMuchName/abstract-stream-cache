import {
    assert,
} from "chai";
import { BufferBuilder } from "../lib";

describe("WritablePath", function () {
    describe("#isBuffer", () => {
        it("should detect buffers", () => {
            assert.isTrue(BufferBuilder.isBuffer(new Buffer("")));
        });
        it("shouldn't detect non buffers", () => {
            assert.isTrue(!BufferBuilder.isBuffer({}));
            assert.isTrue(!BufferBuilder.isBuffer(1));
            assert.isTrue(!BufferBuilder.isBuffer("1"));
            assert.isTrue(!BufferBuilder.isBuffer(undefined));
            assert.isTrue(!BufferBuilder.isBuffer(null));
            assert.isTrue(!BufferBuilder.isBuffer([]));
            assert.isTrue(!BufferBuilder.isBuffer(() => {}));
        });
    });
});
