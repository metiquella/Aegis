.PHONY: test train score serve

test:
	node --experimental-strip-types --test tests/*.test.ts

train:
	node --experimental-strip-types src/cli.ts

serve:
	node --experimental-strip-types src/api.ts

score:
	node --experimental-strip-types src/cli.ts score "$(TX)"