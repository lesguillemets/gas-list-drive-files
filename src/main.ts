function main() {
	const props = PropertiesService.getScriptProperties();
	const rootDirId: string = props.getProperty("rootDirId")!;
	const spreadsheetId: string = props.getProperty("spreadsheetId")!;
	const rootDir = DriveApp.getFolderById(rootDirId);
	const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
	// 一枚目のシートを使う
	const sheet = spreadsheet.getSheets()[0];
	listFiles(rootDir.getFiles(), sheet);
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
	files: GoogleAppsScript.Drive.FileIterator,
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
	sheet.getRange(1, 1, 1, RecordColumns.length).setValues([[RecordColumns]]);
	// 2 行目からデータを書き込みはじめますよ
	let row = 2;

	while (files.hasNext()) {
		// ファイルごとに一行
		const fileRecord = generateRecord(files.next());
		sheet
			.getRange(row, 1, 1, RecordColumns.length)
			.setValues([RecordColumns.map((col) => fileRecord[col])]);
		row++;
	}
	console.log(`Recorded ${row - 1} files`);
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
