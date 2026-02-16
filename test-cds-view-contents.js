#!/usr/bin/env node

/**
 * Test script for GetCDSViewContents resource
 * This demonstrates accessing CDS view data via the resource template
 */

const { readResource } = require('./dist/handlers/resources/index.js');

async function testCDSViewContents() {
    console.log('='.repeat(80));
    console.log('Testing CDS View Contents Resource');
    console.log('='.repeat(80));
    console.log();

    // Test 1: Basic query
    console.log('Test 1: Basic CDS View Query');
    console.log('-'.repeat(80));
    try {
        const uri1 = 'cds-view-data:///I_Currency?max_rows=5';
        console.log(`URI: ${uri1}`);
