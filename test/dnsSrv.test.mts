import {describe, expect, it} from 'vitest';
import {srvRecordsResult} from '../src/index.mjs';

describe('DnsSrv', function () {
	it('should give error if no srv record found', async function () {
		const data = await srvRecordsResult('_minecraft._tcp.eu.google.com');
		expect(data.isErr).to.equal(true);
		expect(data.err()?.message).to.equal('querySrv ENOTFOUND _minecraft._tcp.eu.google.com');
	});
});
