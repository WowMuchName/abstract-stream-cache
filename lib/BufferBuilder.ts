export type CollectableData = string | Buffer;

export class BufferBuilder {
    public static defaultEncoding = "utf8";
    public static toBuffer(data: CollectableData, encoding?: string): Buffer {
        if (BufferBuilder.isBuffer(data)) {
            return data as Buffer;
        }
        return new Buffer(data.toString(), encoding || BufferBuilder.defaultEncoding);
    }

    public static isBuffer(obj: any) {
        return !!obj && !!obj.constructor.prototype && obj.constructor.prototype === Buffer.prototype;
    }

    public encoding: string = BufferBuilder.defaultEncoding;
    private buffer: Buffer = new Buffer(0);

    public constructor(encoding?: string) {
        this.encoding = encoding || BufferBuilder.defaultEncoding;
    }

    public append(data: CollectableData, encoding?: string) {
        const oldData = this.buffer;
        const newData: Buffer = BufferBuilder.toBuffer(data, encoding);
        this.buffer = new Buffer(oldData.length + newData.length);
        oldData.copy(this.buffer, 0);
        newData.copy(this.buffer, oldData.length);
    }

    public getBuffer(): Buffer {
        return this.buffer;
    }
}
