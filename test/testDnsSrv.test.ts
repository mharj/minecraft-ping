import 'mocha';
import * as chai from 'chai';
import {srvRecordsResult} from '../src';

const expect = chai.expect;

describe('DnsSrv', function () {
	it('should give error if no srv record found', async function () {
		const data = await srvRecordsResult('_minecraft._tcp.eu.mineplex.com');
		expect(data.isErr).to.equal(true);
		expect(data.err()?.message).to.equal('querySrv ENOTFOUND _minecraft._tcp.eu.mineplex.com');
	});
});
