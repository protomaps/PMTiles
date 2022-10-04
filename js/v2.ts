import { Header, Cache, RangeResponse } from './v3';

async function getHeaderAndRoot(a:ArrayBuffer, etag?:string): Promise<[Header, [string, number, ArrayBuffer]]> {
	const header = {
		specVersion: 2,
		rootDirectoryOffset: 0,
		rootDirectoryLength: 0,
		jsonMetadataOffset: 0,
		jsonMetadataLength: 0,
		leafDirectoryOffset: 0,
		leafDirectoryLength: undefined,
		tileDataOffset: 512000,
		tileDataLength: undefined,
		numAddressedTiles: 0,
		numTileEntries: 0,
		numTileContents: 0,
		clustered: false,
		internalCompression: 0,
		tileCompression: 0,
		tileType: 0,
		minZoom: 0,
		maxZoom: 0,
		minLon: 0,
		minLat: 0,
		maxLon: 0,
		maxLat: 0,
		centerZoom: 0,
		centerLon: 0,
		centerLat: 0,
		etag: etag,
	};	
	return [header, ["",0,new ArrayBuffer(0)]];
}

async function getZxy(header:Header,cache:Cache): Promise<RangeResponse | undefined> {
	return Promise.resolve(undefined);
}

export default {
	getHeaderAndRoot: getHeaderAndRoot,
	getZxy: getZxy
};

