"""
Use Case Executor for Agent Testing

This module provides functionality to execute predefined use cases against the agent.
Use cases are defined in JSON format and can test various scenarios and inputs.
"""

import json
import asyncio
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path

from ..config import Config
from ..agent import LangGraphAgent


class UseCaseExecutor:
    """
    Executes use cases defined in JSON format against the agent.
    """
    
    def __init__(self, config: Optional[Config] = None):
        """
        Initialize the use case executor.
        
        Args:
            config: Optional configuration object. If None, will create default config.
        """
        self.config = config or Config()
        self.agent = None
        self.results = []
    
    async def load_agent(self):
        """
        Load the agent instance for execution.
        """
        if self.agent is None:
            self.agent = LangGraphAgent(self.config)
    
    async def execute_use_case(self, use_case: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a single use case against the agent.
        
        Args:
            use_case: Dictionary containing use case definition
            
        Returns:
            Dictionary with execution results
        """
        await self.load_agent()
        
        start_time = datetime.now()
        
        try:
            # Extract use case details
            name = use_case.get('name', 'Unnamed Use Case')
            description = use_case.get('description', '')
            input_data = use_case.get('input', {})
            
            print(f"🧪 Executing use case: {name}")
            if description:
                print(f"   Description: {description}")
            
            # Execute the agent
            result = await self.agent.execute(input_data)
            
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
            # Prepare result
            execution_result = {
                'name': name,
                'description': description,
                'input': input_data,
                'output': result,
                'execution_time_seconds': execution_time,
                'timestamp': end_time.isoformat(),
                'status': 'success'
            }
            
            print(f"✅ Use case executed successfully")
            print(f"⏱️  Execution time: {execution_time:.2f} seconds")
            print("-" * 50)
            
            return execution_result
            
        except Exception as e:
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
            error_result = {
                'name': use_case.get('name', 'Unnamed Use Case'),
                'description': use_case.get('description', ''),
                'input': use_case.get('input', {}),
                'output': None,
                'execution_time_seconds': execution_time,
                'timestamp': end_time.isoformat(),
                'status': 'error',
                'error': str(e),
                'error_type': type(e).__name__
            }
            
            print(f"❌ Error executing use case: {error_result['name']}")
            print(f"   Error: {str(e)}")
            print(f"⏱️  Execution time: {execution_time:.2f} seconds")
            print("-" * 50)
            
            return error_result
    
    
    async def execute_use_cases_from_file(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Execute use cases from a JSON file.
        
        Args:
            file_path: Path to the JSON file containing use cases
            
        Returns:
            List of execution results
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                use_cases_data = json.load(f)
            
            use_cases = use_cases_data.get('use_cases', [])
            if not use_cases:
                print(f"⚠️  No use cases found in {file_path}")
                return []
            
            print(f"📁 Loading {len(use_cases)} use cases from {file_path}")
            print("=" * 60)
            
            results = []
            for i, use_case in enumerate(use_cases, 1):
                print(f"\n[{i}/{len(use_cases)}]")
                result = await self.execute_use_case(use_case)
                results.append(result)
            
            self.results.extend(results)
            return results
            
        except FileNotFoundError:
            print(f"❌ Use cases file not found: {file_path}")
            return []
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in use cases file: {e}")
            return []
        except Exception as e:
            print(f"❌ Error loading use cases: {e}")
            return []
    
    def generate_report(self, results: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Generate a summary report of use case execution results.
        
        Args:
            results: Optional list of results. If None, uses self.results.
            
        Returns:
            Summary report dictionary
        """
        if results is None:
            results = self.results
        
        if not results:
            return {'message': 'No results to report'}
        
        total_cases = len(results)
        successful_cases = len([r for r in results if r['status'] == 'success'])
        error_cases = len([r for r in results if r['status'] == 'error'])
        
        avg_execution_time = sum(r['execution_time_seconds'] for r in results) / total_cases
        
        report = {
            'summary': {
                'total_cases': total_cases,
                'successful': successful_cases,
                'errors': error_cases,
                'success_rate': (successful_cases / total_cases) * 100,
                'average_execution_time_seconds': round(avg_execution_time, 2)
            },
            'results': results,
            'generated_at': datetime.now().isoformat()
        }
        
        return report
    
    def print_report(self, results: Optional[List[Dict[str, Any]]] = None):
        """
        Print a formatted summary report.
        
        Args:
            results: Optional list of results. If None, uses self.results.
        """
        report = self.generate_report(results)
        
        if 'message' in report:
            print(report['message'])
            return
        
        summary = report['summary']
        
        print("\n" + "=" * 60)
        print("📊 USE CASE EXECUTION REPORT")
        print("=" * 60)
        print(f"Total Use Cases: {summary['total_cases']}")
        print(f"✅ Successful: {summary['successful']}")
        print(f"🚨 Errors: {summary['errors']}")
        print(f"📈 Success Rate: {summary['success_rate']:.1f}%")
        print(f"⏱️  Average Execution Time: {summary['average_execution_time_seconds']}s")
        print("=" * 60)
        
        # Show failed cases
        failed_cases = [r for r in report['results'] if r['status'] != 'success']
        if failed_cases:
            print("\n❌ FAILED CASES:")
            for case in failed_cases:
                print(f"  • {case['name']}: {case['status']}")
                if 'error' in case:
                    print(f"    Error: {case['error']}")
        
        # Show successful cases summary
        successful_cases = [r for r in report['results'] if r['status'] == 'success']
        if successful_cases:
            print(f"\n✅ SUCCESSFUL CASES ({len(successful_cases)}):")
            for case in successful_cases[:5]:  # Show first 5
                print(f"  • {case['name']} ({case['execution_time_seconds']:.2f}s)")
            if len(successful_cases) > 5:
                print(f"  ... and {len(successful_cases) - 5} more")


async def run_use_cases_from_file(file_path: str, config: Optional[Config] = None):
    """
    Convenience function to run use cases from a file and print results.
    
    Args:
        file_path: Path to the JSON file containing use cases
        config: Optional configuration object
    """
    executor = UseCaseExecutor(config)
    results = await executor.execute_use_cases_from_file(file_path)
    executor.print_report(results)
    return results
