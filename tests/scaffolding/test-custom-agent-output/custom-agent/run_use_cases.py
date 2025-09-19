#!/usr/bin/env python3
"""
Use Case Runner Script

This script executes use cases defined in JSON format against the agent.
It provides a command-line interface for running and managing test cases.

Usage:
    python run_use_cases.py                    # Run all use cases in use_cases/ directory
    python run_use_cases.py --file path/to/file.json  # Run specific use case file
    python run_use_cases.py --list             # List available use case files
    python run_use_cases.py --report           # Generate detailed report
"""

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import List, Optional

# Add the src directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from src.config import Config
from src.utils.use_case_executor import UseCaseExecutor


def find_use_case_files(use_cases_dir: str = "use_cases") -> List[str]:
    """
    Find all JSON files in the use cases directory.
    
    Args:
        use_cases_dir: Directory to search for use case files
        
    Returns:
        List of JSON file paths
    """
    use_cases_path = Path(use_cases_dir)
    
    if not use_cases_path.exists():
        print(f"⚠️  Use cases directory not found: {use_cases_dir}")
        return []
    
    json_files = list(use_cases_path.glob("*.json"))
    return [str(f) for f in json_files]


def list_use_case_files(use_cases_dir: str = "use_cases"):
    """
    List all available use case files.
    
    Args:
        use_cases_dir: Directory containing use case files
    """
    files = find_use_case_files(use_cases_dir)
    
    if not files:
        print(f"📁 No use case files found in {use_cases_dir}/")
        return
    
    print(f"📁 Available use case files in {use_cases_dir}/:")
    for i, file_path in enumerate(files, 1):
        file_name = Path(file_path).name
        file_size = os.path.getsize(file_path)
        print(f"  {i}. {file_name} ({file_size} bytes)")
    
    # Show preview of each file
    print("\n📋 Preview of use cases:")
    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            metadata = data.get('metadata', {})
            use_cases = data.get('use_cases', [])
            
            print(f"\n  📄 {Path(file_path).name}:")
            print(f"     Name: {metadata.get('name', 'Unnamed')}")
            print(f"     Description: {metadata.get('description', 'No description')}")
            print(f"     Use Cases: {len(use_cases)}")
            
            if use_cases:
                print("     Sample cases:")
                for case in use_cases[:3]:  # Show first 3 cases
                    print(f"       • {case.get('name', 'Unnamed')}")
                if len(use_cases) > 3:
                    print(f"       ... and {len(use_cases) - 3} more")
                    
        except Exception as e:
            print(f"     ❌ Error reading file: {e}")


async def run_use_cases(use_cases_dir: str = "use_cases", specific_file: Optional[str] = None):
    """
    Run use cases from files.
    
    Args:
        use_cases_dir: Directory containing use case files
        specific_file: Optional specific file to run
    """
    config = Config()
    executor = UseCaseExecutor(config)
    
    if specific_file:
        # Run specific file
        if not os.path.exists(specific_file):
            print(f"❌ File not found: {specific_file}")
            return
        
        print(f"🚀 Running use cases from: {specific_file}")
        results = await executor.execute_use_cases_from_file(specific_file)
    else:
        # Run all files in directory
        files = find_use_case_files(use_cases_dir)
        
        if not files:
            print(f"📁 No use case files found in {use_cases_dir}/")
            return
        
        print(f"🚀 Running use cases from {len(files)} file(s) in {use_cases_dir}/")
        all_results = []
        
        for file_path in files:
            print(f"\n📄 Processing: {Path(file_path).name}")
            results = await executor.execute_use_cases_from_file(file_path)
            all_results.extend(results)
        
        results = all_results
    
    # Print summary report
    executor.print_report(results)
    
    # Save detailed report
    report = executor.generate_report(results)
    report_file = "use_case_report.json"
    
    try:
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"\n📊 Detailed report saved to: {report_file}")
    except Exception as e:
        print(f"⚠️  Could not save report: {e}")


async def generate_report_only(use_cases_dir: str = "use_cases"):
    """
    Generate a report without running use cases (if previous results exist).
    
    Args:
        use_cases_dir: Directory containing use case files
    """
    report_file = "use_case_report.json"
    
    if not os.path.exists(report_file):
        print(f"❌ No previous report found: {report_file}")
        print("Run use cases first to generate a report.")
        return
    
    try:
        with open(report_file, 'r', encoding='utf-8') as f:
            report = json.load(f)
        
        config = Config()
        executor = UseCaseExecutor(config)
        executor.results = report.get('results', [])
        
        executor.print_report()
        
    except Exception as e:
        print(f"❌ Error reading report: {e}")


def main():
    """Main entry point for the use case runner."""
    parser = argparse.ArgumentParser(
        description="Run use cases against the agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_use_cases.py                           # Run all use cases
  python run_use_cases.py --file my_cases.json     # Run specific file
  python run_use_cases.py --list                   # List available files
  python run_use_cases.py --report                 # Show previous report
  python run_use_cases.py --dir custom_cases/      # Use custom directory
        """
    )
    
    parser.add_argument(
        '--file', '-f',
        help='Run use cases from a specific JSON file'
    )
    
    parser.add_argument(
        '--dir', '-d',
        default='use_cases',
        help='Directory containing use case files (default: use_cases)'
    )
    
    parser.add_argument(
        '--list', '-l',
        action='store_true',
        help='List available use case files'
    )
    
    parser.add_argument(
        '--report', '-r',
        action='store_true',
        help='Show previous execution report'
    )
    
    args = parser.parse_args()
    
    try:
        if args.list:
            list_use_case_files(args.dir)
        elif args.report:
            asyncio.run(generate_report_only(args.dir))
        else:
            asyncio.run(run_use_cases(args.dir, args.file))
            
    except KeyboardInterrupt:
        print("\n⏹️  Execution interrupted by user")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
