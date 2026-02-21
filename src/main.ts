function main() {
	const props = PropertiesService.getScriptProperties();
	const rootDirId = props.getProperty("rootDirId");
	if (rootDirId === null) {
		console.error("Error, variable rootDirId not set");
		return;
	}
	const spreadsheetId = props.getProperty("spreadsheetId")!;
	if (spreadsheetId === null) {
		console.error("Error, variable spreadsheet not set");
		return;
	}
	console.log(`getting root folder ${rootDirId}`);
	const rootDir = DriveApp.getFolderById(rootDirId);
	console.log(`... got it. The folder is named ${rootDir.getName()}`);
	console.log(`loading spreadsheet with id: ${spreadsheetId}`);
	const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
	console.log(`... spreadsheet loaded. Its name is ${spreadsheet.getName()}`);
	// 一枚目のシートを使う
	const sheet = spreadsheet.getSheets()[0];
	listFiles(rootDir, sheet);
	console.log(`Processing done; spreadsheet is at ${spreadsheet.getUrl()}`);
}

// ファイルからこういうデータを取るよ
interface FileRecord {
	fileID: string;
	location: string;
	fileName: string;
	URL: string;
	owner: string;
	type: string;
	created: GoogleAppsScript.Base.Date;
	updated: GoogleAppsScript.Base.Date;
	size: number;
}

function generateRecord(f: GoogleAppsScript.Drive.File): FileRecord {
	return {
		fileID: f.getId(),
		location: getLocationString(f),
		fileName: f.getName(),
		URL: f.getUrl(),
		owner: f.getOwner().getEmail(),
		type: f.getMimeType(),
		created: f.getDateCreated(),
		updated: f.getLastUpdated(),
		size: f.getSize(),
	};
}

// スプレッドシートへの記録の順番と種類
const RecordColumns = [
	"location",
	"fileName",
	"URL",
	"owner",
	"type",
	"created",
	"updated",
	"fileID",
	"size",
] as const satisfies Array<keyof FileRecord>;

function listFiles(
	rootDir: GoogleAppsScript.Drive.Folder,
	sheet: GoogleAppsScript.Spreadsheet.Sheet,
	override: boolean = true,
) {
	if (!override) {
		console.log("TODO: updating rather than appending isn't supported yet");
		return;
	}
	console.log("listFiles: Formatting..");
	// シートを全部消して
	sheet.clear({ contentsOnly: true });
	// ヘッダの設定
	sheet.getRange(1, 1, 1, RecordColumns.length).setValues([RecordColumns]);
	// 2 行目からデータを書き込みはじめますよ

	const processed = walkFiles(rootDir, sheet);
	console.log(`Recorded ${processed} files`);
}

function walkFiles(
	rootDir: GoogleAppsScript.Drive.Folder,
	sheet: GoogleAppsScript.Spreadsheet.Sheet,
): number {
	let n = 0;
	const stack: GoogleAppsScript.Drive.Folder[] = [rootDir];
	while (stack.length > 0) {
		const dir = stack.pop() as GoogleAppsScript.Drive.Folder;
		console.log(`Reading folder ${dir.getName()}...`);
		const files = dir.getFiles();
		while (files.hasNext()) {
			n++;
			const fileRecord = generateRecord(files.next());
			sheet
				.getRange(n + 1, 1, 1, RecordColumns.length)
				.setValues([RecordColumns.map((col) => fileRecord[col])]);
			if (n % 20 === 0) {
				console.log(`logging: Processed ${n} files`);
			}
		}
		const subDirs = dir.getFolders();
		while (subDirs.hasNext()) {
			stack.push(subDirs.next());
		}
	}
	return n;
}

function getLocationString(f: GoogleAppsScript.Drive.File): string {
	// parents が親フォルダを順に返してくれるので，それを
	// root » folder » subfolder みたいな文字列にする
	const parentsIterator = f.getParents();
	const parents: Array<string> = [];
	while (parentsIterator.hasNext()) {
		const parent = parentsIterator.next();
		parents.push(parent.getName());
	}
	return parents.reverse().join(" \u00BB ");
}
