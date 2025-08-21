# Get the current date in YYYY-MM-DD format
date := `TZ=America/Los_Angeles date +%Y-%m-%d`

safe_zones_path := justfile_directory() + "/data/safe_zones.json"
csr_path := env("CSR_PATH", "/tmp/csr-" + date + ".csv")
simple_reports_path := env("SIMPLE_REPORTS_PATH", "/tmp/simple_reports.json")
overall_report_path := env("OVERALL_REPORT_PATH", "/tmp/overall_report.json")

default: do_it download_csr simple_reports overall_report
	@echo "Pipeline complete!"
	
download_csr:
	#!/bin/sh	
	if [ ! -f {{csr_path}} ]; then
		echo "Downloading CSR data to {{csr_path}}..."
		npx tsx src/cli/downloadSeattle.ts csr > {{csr_path}}
	fi

clean_csr:
	@echo "Cleaning up CSR data..."
	rm -f {{csr_path}}

simple_reports: download_csr
	#!/bin/sh
	if [ ! -f {{simple_reports_path}} ]; then
		echo "Building simple reports at {{simple_reports_path}}..."
		npx tsx src/cli/simpleReports.ts --safe-zones {{safe_zones_path}} --csr {{csr_path}} > {{simple_reports_path}}
	fi

clean_simple_reports:
	@echo "Cleaning up simple reports..."
	rm -f {{simple_reports_path}}

overall_report:
	#!/bin/sh
	if [ ! -f {{overall_report_path}} ]; then
		echo "Building overall report at {{overall_report_path}}..."
		npx tsx src/cli/overallReport.ts --csr {{csr_path}} > {{overall_report_path}}
	fi

clean_overall_report:
	@echo "Cleaning up overall report..."
	rm -f {{overall_report_path}}

clean_local: clean_simple_reports clean_overall_report
	@echo "Pipeline local files cleaned!"

clean: clean_csr clean_simple_reports clean_overall_report
	@echo "Pipeline cleaned!"
