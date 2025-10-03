# GLEIF POC End-to-End Testing

This document describes the automated end-to-end testing system for the GLEIF POC (Proof of Concept) system.

## Overview

The `test-e2e.sh` script provides comprehensive automated testing of the entire GLEIF POC system, including:

- Environment setup and dependency installation
- Service startup (Vault, Twin Service, Frontend)
- DID creation and credential generation
- API endpoint validation
- End-to-end verification flow testing
- IOTA explorer link validation
- Frontend build testing
- Comprehensive test reporting

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for HashiCorp Vault)
- jq (JSON processor)
- curl
- Basic Unix tools (grep, sed, etc.)

### Running the Tests

#### Option 1: Using npm script (Recommended)
```bash
npm run test:e2e
```

#### Option 2: Direct execution
```bash
./test-e2e.sh
```

#### Option 3: With custom log location
```bash
LOG_FILE=custom-log.log REPORT_FILE=custom-report.md ./test-e2e.sh
```

## What the Test Script Does

### 1. Environment Setup
- ✅ Checks prerequisites (Node.js, npm, Docker, jq)
- ✅ Verifies required ports are available (3000, 3001, 8200)
- ✅ Installs dependencies for all components

### 2. Service Startup
- ✅ Starts HashiCorp Vault in development mode
- ✅ Starts Twin Service with Vault integration
- ✅ Starts GLEIF POC Next.js frontend
- ✅ Waits for all services to be ready

### 3. DID Management Testing
- ✅ Creates new TWIN DID on IOTA testnet
- ✅ Generates KERI credentials linked to the DID
- ✅ Validates wallet file creation

### 4. API Endpoint Testing
- ✅ Tests Twin Service `/create-did` endpoint
- ✅ Tests Twin Service `/resolve-did/:did` endpoint
- ✅ Tests Frontend `/api/verify` endpoint

### 5. Verification Flow Testing
- ✅ Performs end-to-end DID verification
- ✅ Validates VERIFIED status response
- ✅ Checks attestation DID and NFT ID generation

### 6. IOTA Explorer Link Testing
- ✅ Validates DID format for explorer links
- ✅ Validates NFT ID format for explorer links
- ✅ Validates attestation DID format

### 7. Build Testing
- ✅ Tests frontend build process
- ✅ Validates credential file generation
- ✅ Ensures production readiness

### 8. Cleanup
- ✅ Stops all services gracefully
- ✅ Removes Docker containers
- ✅ Provides comprehensive test report

## Test Output

### Console Output
The script provides real-time colored output:
- 🔵 Blue: General information and progress
- 🟢 Green: Successful test results
- 🔴 Red: Failed test results
- 🟡 Yellow: Warnings and details

### Log Files
- **Detailed Log**: `test-results-YYYYMMDD-HHMMSS.log`
  - Contains all script output and debugging information
  - Includes timestamps for each operation
  - Useful for troubleshooting failures

### Test Report
- **Markdown Report**: `test-report-YYYYMMDD-HHMMSS.md`
  - Executive summary with pass/fail counts
  - Detailed test results
  - Recommendations based on results
  - Final PASS/FAIL status

## Test Scenarios Covered

### ✅ Happy Path Testing
- Complete end-to-end verification flow
- All services starting successfully
- DID creation and credential generation
- Successful verification with VERIFIED status

### ❌ Error Scenario Testing
- Service startup failures
- Port conflicts
- Missing dependencies
- Invalid DID formats
- Network connectivity issues

### 🔄 Integration Testing
- Cross-service communication
- Vault integration
- IOTA testnet connectivity
- Frontend-backend API calls

## Environment Variables

You can customize the test execution using environment variables:

```bash
# Custom log and report files
LOG_FILE=my-custom.log REPORT_FILE=my-report.md ./test-e2e.sh

# Skip certain tests (for debugging)
SKIP_DID_TESTS=true ./test-e2e.sh

# Change service startup timeouts
SERVICE_TIMEOUT=60 ./test-e2e.sh
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```
❌ Error: Port 3000 is already in use
```
**Solution**: Stop conflicting services or change ports in configuration.

#### Docker Permission Issues
```
❌ Error: Failed to start Vault
```
**Solution**: Ensure Docker is running and you have permissions.

#### Missing Dependencies
```
❌ Error: jq not found
```
**Solution**: Install missing tools:
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# CentOS/RHEL
sudo yum install jq
```

#### Service Startup Timeouts
```
❌ Error: Twin Service failed to start within 30 seconds
```
**Solution**: Increase timeout or check service logs.

### Debug Mode

Run with verbose logging:
```bash
bash -x ./test-e2e.sh
```

Check service logs individually:
```bash
# Vault logs
docker logs vault-dev

# Twin Service logs (if running)
cd twin-service && npm run start:vault

# Frontend logs (if running)
cd gleif-frontend && npm run dev
```

## Test Results Interpretation

### PASS Criteria
- All services start successfully
- DID creation completes without errors
- Credential files are generated
- API endpoints return expected responses
- Verification flow returns VERIFIED status
- Frontend builds successfully
- All cleanup operations complete

### FAIL Criteria
- Any service fails to start
- DID creation fails
- API endpoints return errors
- Verification returns NOT VERIFIED or ERROR
- Build process fails
- Cleanup operations fail

## Integration with CI/CD

The test script can be integrated into CI/CD pipelines:

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: |
    chmod +x test-e2e.sh
    ./test-e2e.sh

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: test-results
    path: |
      test-results-*.log
      test-report-*.md
```

### Jenkins Example
```groovy
stage('E2E Tests') {
    steps {
        sh 'chmod +x test-e2e.sh'
        sh './test-e2e.sh'
    }
    post {
        always {
            archiveArtifacts artifacts: 'test-results-*.log,test-report-*.md', fingerprint: true
        }
    }
}
```

## Performance Considerations

- **Test Duration**: ~5-10 minutes depending on IOTA network latency
- **Resource Usage**: Moderate CPU and memory usage
- **Network**: Requires internet access for IOTA testnet and Docker Hub
- **Disk Space**: ~500MB for Docker images and build artifacts

## Security Notes

- Uses development Vault configuration (not suitable for production)
- Creates real IOTA testnet transactions (minimal cost)
- Generates temporary test DIDs and credentials
- All test data is cleaned up after execution

## Contributing

When modifying the test script:

1. Maintain backward compatibility
2. Add new test cases for new features
3. Update this documentation
4. Test on multiple environments
5. Ensure idempotent operations

## Support

For issues with the test script:

1. Check the detailed log file for errors
2. Review the test report for failed tests
3. Verify environment prerequisites
4. Check service logs individually
5. Create an issue with log files attached