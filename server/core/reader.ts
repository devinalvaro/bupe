export type ReaderOp<T> =
	| { type: "Read"; name: string; next: (document: string) => Reader<T> }
	| { type: "Value"; value: T }
	| { type: "NotFound" };

export class Reader<A> {
	readonly op: ReaderOp<A>;

	constructor(op: ReaderOp<A>) {
		this.op = op;
	}

	static read<A>(name: string, next: (document: string) => Reader<A>): Reader<A> {
		return new Reader({ type: "Read", name, next });
	}

	static value<A>(value: A): Reader<A> {
		return new Reader({ type: "Value", value });
	}

	static notFound<A>(): Reader<A> {
		return new Reader({ type: "NotFound" });
	}

	andThen<B>(f: (a: A) => Reader<B>): Reader<B> {
		const op = this.op;
		switch (op.type) {
			case "Value":
				return f(op.value);
			case "Read":
				return Reader.read(op.name, (document) => op.next(document).andThen(f));
			case "NotFound":
				return Reader.notFound();
			default: {
				const _: never = op;
				return _ as Reader<B>;
			}
		}
	}

	map<B>(f: (a: A) => B): Reader<B> {
		return this.andThen((a) => Reader.value(f(a)));
	}
}
