import {
    Observable,
    Subject,
} from "rxjs";
import {
    Writable,
} from "stream";
import {
    BufferBuilder,
} from "./BufferBuilder";

function conditionallyInvoke(...functions: any[]) {
    for (const fun of functions) {
        if (typeof fun === "function") {
            fun();
        }
    }
}

export function interceptWritable(writable: Writable): Observable<Buffer> {
    const origWrite = writable.write;
    const origEnd = writable.end;
    const subject: Subject < Buffer > = new Subject();
    const failWithError = (error: any) => {
        subject.error(error);
        writable.write = origWrite;
        writable.end = origEnd;
    };

    writable.write = (function () {
        // write(chunk: any, cb?: Function): boolean;
        // write(chunk: any, encoding?: string, cb?: Function): boolean;
        try {
            subject.next(BufferBuilder.toBuffer(arguments[0], arguments[1]));
            conditionallyInvoke(arguments[1], arguments[2]);
        } catch (error) {
            failWithError(error);
        }
    } as any);
    writable.end = (function () {
        // end(cb?: Function): void;
        // end(chunk: any, cb?: Function): void;
        // end(chunk: any, encoding?: string, cb?: Function): void;
        try {
            if (typeof arguments[0] !== "undefined" && typeof arguments[0] !== "function") {
                subject.next(BufferBuilder.toBuffer(arguments[0], arguments[1]));
            }
            conditionallyInvoke(arguments[0], arguments[1], arguments[2]);
            writable.write = origWrite;
            writable.end = origEnd;
            subject.complete();
        } catch (error) {
            failWithError(error);
        }
    } as any);
    return subject.asObservable();
}

export type WritableMapper = (chunk: Buffer) => Buffer;
export function mapWritable(writable: Writable, chunked?: boolean): Observable<Buffer> {
    const origWrite = writable.write.bind(writable);
    const origEnd = writable.end.bind(writable);
    const inputObservable: Observable<Buffer> = interceptWritable(writable);
    const subject: Subject<Buffer> = new Subject();
    if (!chunked) {
        const builder: BufferBuilder = new BufferBuilder();
        inputObservable.subscribe((chunk) => {
            builder.append(chunk);
        }, (err) => {
            subject.error(err);
        }, () => {
            const fullData: Buffer = builder.getBuffer();
            origEnd(fullData, () => {
                subject.next(fullData);
                subject.complete();
            });
        });
    } else {
        inputObservable.subscribe(
            (chunk) => origWrite(chunk, () => subject.next(chunk)),
            (error) => subject.error(error),
            () => origEnd(() => subject.complete()),
        );
    }
    return subject.asObservable();
}
