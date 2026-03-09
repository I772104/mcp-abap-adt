/**
 * Unit Tests for fileUtils.ts
 *
 * Tests pure validation and utility functions - no SAP connection required.
 * Focus on ABAP naming conventions and file path handling.
 */

import {
    buildAbapFileName,
    convertToZClassName,
    countSourceLines,
    extractClassNameFromFile,
    isLocalClassName,
    isSapStandardObject,
    validateLocalClassName,
    isLocalPackage,
    validateLocalPackage,
    resolveAbapFilePath,
    getTmpDir,
    ABAP_CLASS_NAME_MAX_LENGTH,
    ABAP_FILE_EXTENSION,
    TMP_DIR_NAME,
} from '../../../src/lib/fileUtils';
import { McpError } from '../../../src/lib/utils';

describe('fileUtils', () => {
    // =========================================================================
    // CONSTANTS
    // =========================================================================
    describe('Constants', () => {
        test('ABAP_CLASS_NAME_MAX_LENGTH should be 30', () => {
            expect(ABAP_CLASS_NAME_MAX_LENGTH).toBe(30);
        });

        test('ABAP_FILE_EXTENSION should be .abap', () => {
            expect(ABAP_FILE_EXTENSION).toBe('.abap');
        });

        test('TMP_DIR_NAME should be tmp', () => {
            expect(TMP_DIR_NAME).toBe('tmp');
        });
    });

    // =========================================================================
    // buildAbapFileName
    // =========================================================================
    describe('buildAbapFileName', () => {
        test('should append .abap extension to class name', () => {
            expect(buildAbapFileName('ZCL_MY_CLASS')).toBe('ZCL_MY_CLASS.abap');
        });

        test('should handle lowercase input', () => {
            expect(buildAbapFileName('zcl_test')).toBe('zcl_test.abap');
        });

        test('should handle empty string', () => {
            expect(buildAbapFileName('')).toBe('.abap');
        });
    });

    // =========================================================================
    // convertToZClassName
    // =========================================================================
    describe('convertToZClassName', () => {
        describe('Already Z/Y prefixed names', () => {
            test('should not convert Z-prefixed class', () => {
                const result = convertToZClassName('ZCL_MY_CLASS');
                expect(result.zClassName).toBe('ZCL_MY_CLASS');
                expect(result.wasConverted).toBe(false);
                expect(result.wasTruncated).toBe(false);
            });

            test('should not convert Y-prefixed class', () => {
                const result = convertToZClassName('YCL_MY_CLASS');
                expect(result.zClassName).toBe('YCL_MY_CLASS');
                expect(result.wasConverted).toBe(false);
                expect(result.wasTruncated).toBe(false);
            });

            test('should handle lowercase z-prefix', () => {
                const result = convertToZClassName('zcl_test');
                expect(result.zClassName).toBe('ZCL_TEST');
                expect(result.wasConverted).toBe(false);
            });
        });

        describe('Standard SAP class name conversion', () => {
            test('should convert CL_ prefix to ZCL_', () => {
                const result = convertToZClassName('CL_MY_CLASS');
                expect(result.zClassName).toBe('ZCL_MY_CLASS');
                expect(result.wasConverted).toBe(true);
                expect(result.wasTruncated).toBe(false);
            });

            test('should convert IF_ prefix to ZIF_', () => {
                const result = convertToZClassName('IF_MY_INTERFACE');
                expect(result.zClassName).toBe('ZIF_MY_INTERFACE');
                expect(result.wasConverted).toBe(true);
            });

            test('should convert TC_ prefix to ZTC_', () => {
                const result = convertToZClassName('TC_TEST_CLASS');
                expect(result.zClassName).toBe('ZTC_TEST_CLASS');
                expect(result.wasConverted).toBe(true);
            });

            test('should handle lowercase standard prefix', () => {
                const result = convertToZClassName('cl_example');
                expect(result.zClassName).toBe('ZCL_EXAMPLE');
                expect(result.wasConverted).toBe(true);
            });
        });

        describe('Non-standard names', () => {
            test('should add Z_ prefix to names without standard prefix', () => {
                const result = convertToZClassName('MYCLASS');
                expect(result.zClassName).toBe('Z_MYCLASS');
                expect(result.wasConverted).toBe(true);
            });

            test('should handle single character name', () => {
                const result = convertToZClassName('A');
                expect(result.zClassName).toBe('Z_A');
                expect(result.wasConverted).toBe(true);
            });
        });

        describe('Truncation handling', () => {
            test('should truncate names exceeding 30 characters', () => {
                const longName = 'CL_THIS_IS_A_VERY_LONG_CLASS_NAME_THAT_EXCEEDS';
                const result = convertToZClassName(longName);
                expect(result.zClassName.length).toBe(30);
                expect(result.wasTruncated).toBe(true);
                expect(result.wasConverted).toBe(true);
            });

            test('should truncate already Z-prefixed long names', () => {
                const longZName = 'ZCL_THIS_IS_A_VERY_LONG_CLASS_NAME';
                const result = convertToZClassName(longZName);
                expect(result.zClassName.length).toBe(30);
                expect(result.wasTruncated).toBe(true);
                expect(result.wasConverted).toBe(false);
            });

            test('should not truncate exactly 30 character names', () => {
                const exact30 = 'ZCL_EXACTLY_THIRTY_CHARS_HERE_'; // Exactly 30 chars
                expect(exact30.length).toBe(30);
                const result = convertToZClassName(exact30);
                expect(result.wasTruncated).toBe(false);
            });
        });
    });

    // =========================================================================
    // countSourceLines
    // =========================================================================
    describe('countSourceLines', () => {
        test('should count single line', () => {
            expect(countSourceLines('REPORT test.')).toBe(1);
        });

        test('should count multiple lines with LF', () => {
            expect(countSourceLines('line1\nline2\nline3')).toBe(3);
        });

        test('should count multiple lines with CRLF', () => {
            expect(countSourceLines('line1\r\nline2\r\nline3')).toBe(3);
        });

        test('should handle empty string', () => {
            expect(countSourceLines('')).toBe(1);
        });

        test('should handle trailing newline', () => {
            expect(countSourceLines('line1\nline2\n')).toBe(3);
        });
    });

    // =========================================================================
    // extractClassNameFromFile
    // =========================================================================
    describe('extractClassNameFromFile', () => {
        test('should extract class name from .abap file path', () => {
            expect(extractClassNameFromFile('/path/to/ZCL_MY_CLASS.abap')).toBe('ZCL_MY_CLASS');
        });

        test('should convert to uppercase', () => {
            expect(extractClassNameFromFile('/path/zcl_lower.abap')).toBe('ZCL_LOWER');
        });

        test('should handle Windows-style paths', () => {
            expect(extractClassNameFromFile('C:\\tmp\\ZCL_TEST.abap')).toBe('ZCL_TEST');
        });

        test('should handle filename only (no path)', () => {
            expect(extractClassNameFromFile('ZCL_SIMPLE.abap')).toBe('ZCL_SIMPLE');
        });
    });

    // =========================================================================
    // isLocalClassName
    // =========================================================================
    describe('isLocalClassName', () => {
        test('should return true for Z-prefixed names', () => {
            expect(isLocalClassName('ZCL_MY_CLASS')).toBe(true);
            expect(isLocalClassName('Z_TEST')).toBe(true);
            expect(isLocalClassName('ZTEST')).toBe(true);
        });

        test('should return true for Y-prefixed names', () => {
            expect(isLocalClassName('YCL_MY_CLASS')).toBe(true);
            expect(isLocalClassName('Y_TEST')).toBe(true);
        });

        test('should handle lowercase', () => {
            expect(isLocalClassName('zcl_test')).toBe(true);
            expect(isLocalClassName('ycl_test')).toBe(true);
        });

        test('should return false for SAP standard names', () => {
            expect(isLocalClassName('CL_ABAP_REGEX')).toBe(false);
            expect(isLocalClassName('IF_MESSAGE')).toBe(false);
            expect(isLocalClassName('TC_TEST')).toBe(false);
        });

        test('should return false for names starting with other letters', () => {
            expect(isLocalClassName('ABAP_TEST')).toBe(false);
            expect(isLocalClassName('XCL_CUSTOM')).toBe(false);
        });
    });

    // =========================================================================
    // isSapStandardObject
    // =========================================================================
    describe('isSapStandardObject', () => {
        test('should return true for SAP standard names', () => {
            expect(isSapStandardObject('CL_ABAP_REGEX')).toBe(true);
            expect(isSapStandardObject('IF_MESSAGE')).toBe(true);
        });

        test('should return false for Z/Y names', () => {
            expect(isSapStandardObject('ZCL_MY_CLASS')).toBe(false);
            expect(isSapStandardObject('YCL_MY_CLASS')).toBe(false);
        });

        test('should be inverse of isLocalClassName', () => {
            const testNames = ['ZCL_TEST', 'CL_ABAP', 'YIF_TEST', 'IF_TEST'];
            testNames.forEach((name) => {
                expect(isSapStandardObject(name)).toBe(!isLocalClassName(name));
            });
        });
    });

    // =========================================================================
    // validateLocalClassName
    // =========================================================================
    describe('validateLocalClassName', () => {
        describe('Valid class names', () => {
            test('should accept valid Z-prefixed class name', () => {
                expect(validateLocalClassName('ZCL_MY_CLASS')).toBe('ZCL_MY_CLASS');
            });

            test('should accept valid Y-prefixed class name', () => {
                expect(validateLocalClassName('YCL_MY_CLASS')).toBe('YCL_MY_CLASS');
            });

            test('should convert to uppercase', () => {
                expect(validateLocalClassName('zcl_lower')).toBe('ZCL_LOWER');
            });

            test('should accept names with numbers', () => {
                expect(validateLocalClassName('ZCL_TEST_123')).toBe('ZCL_TEST_123');
            });

            test('should accept names with underscores', () => {
                expect(validateLocalClassName('Z_MY_TEST_CLASS')).toBe('Z_MY_TEST_CLASS');
            });

            test('should accept minimum valid name', () => {
                expect(validateLocalClassName('Z1')).toBe('Z1');
            });
        });

        describe('Invalid class names', () => {
            test('should reject empty string', () => {
                expect(() => validateLocalClassName('')).toThrow(McpError);
                expect(() => validateLocalClassName('')).toThrow('required');
            });

            test('should reject non-Z/Y prefixed names', () => {
                expect(() => validateLocalClassName('CL_NOT_LOCAL')).toThrow(McpError);
                expect(() => validateLocalClassName('CL_NOT_LOCAL')).toThrow('must start with Z or Y');
            });

            test('should reject names exceeding 30 characters', () => {
                const longName = 'ZCL_THIS_NAME_IS_WAY_TOO_LONG_FOR_ABAP';
                expect(() => validateLocalClassName(longName)).toThrow(McpError);
                expect(() => validateLocalClassName(longName)).toThrow('30 characters');
            });

            test('should reject names with invalid characters', () => {
                expect(() => validateLocalClassName('ZCL-INVALID')).toThrow('invalid characters');
                expect(() => validateLocalClassName('ZCL.TEST')).toThrow('invalid characters');
                expect(() => validateLocalClassName('ZCL TEST')).toThrow('invalid characters');
                expect(() => validateLocalClassName('ZCL@TEST')).toThrow('invalid characters');
            });
        });
    });

    // =========================================================================
    // isLocalPackage
    // =========================================================================
    describe('isLocalPackage', () => {
        test('should return true for $TMP', () => {
            expect(isLocalPackage('$TMP')).toBe(true);
        });

        test('should return true for $LOCAL', () => {
            expect(isLocalPackage('$LOCAL')).toBe(true);
        });

        test('should return true for any $-prefixed package', () => {
            expect(isLocalPackage('$MY_PACKAGE')).toBe(true);
            expect(isLocalPackage('$TEST')).toBe(true);
        });

        test('should return false for regular packages', () => {
            expect(isLocalPackage('ZPACKAGE')).toBe(false);
            expect(isLocalPackage('MY_PACKAGE')).toBe(false);
        });

        test('should return false for packages containing but not starting with $', () => {
            expect(isLocalPackage('TEST$PACKAGE')).toBe(false);
        });
    });

    // =========================================================================
    // validateLocalPackage
    // =========================================================================
    describe('validateLocalPackage', () => {
        test('should not throw for $TMP', () => {
            expect(() => validateLocalPackage('$TMP')).not.toThrow();
        });

        test('should not throw for $LOCAL', () => {
            expect(() => validateLocalPackage('$LOCAL')).not.toThrow();
        });

        test('should not throw for $-prefixed packages', () => {
            expect(() => validateLocalPackage('$MY_LOCAL')).not.toThrow();
        });

        test('should throw for non-local packages', () => {
            expect(() => validateLocalPackage('ZPACKAGE')).toThrow(McpError);
            expect(() => validateLocalPackage('ZPACKAGE')).toThrow('must be local');
        });

        test('should throw for regular packages', () => {
            expect(() => validateLocalPackage('MY_PACKAGE')).toThrow('must be local');
        });
    });

    // =========================================================================
    // resolveAbapFilePath
    // =========================================================================
    describe('resolveAbapFilePath', () => {
        test('should return absolute path unchanged', () => {
            const absolutePath = '/absolute/path/to/file.abap';
            expect(resolveAbapFilePath(absolutePath)).toBe(absolutePath);
        });

        test('should return Windows absolute path unchanged', () => {
            const windowsPath = 'C:\\path\\to\\file.abap';
            expect(resolveAbapFilePath(windowsPath)).toBe(windowsPath);
        });

        test('should resolve relative path against tmp folder', () => {
            const result = resolveAbapFilePath('ZCL_TEST.abap');
            expect(result).toContain(TMP_DIR_NAME);
            expect(result).toContain('ZCL_TEST.abap');
        });

        test('should resolve filename only against tmp folder', () => {
            const result = resolveAbapFilePath('myfile.abap');
            expect(result).toContain(TMP_DIR_NAME);
        });
    });

    // =========================================================================
    // getTmpDir
    // =========================================================================
    describe('getTmpDir', () => {
        test('should return path containing tmp', () => {
            const tmpDir = getTmpDir();
            expect(tmpDir).toContain(TMP_DIR_NAME);
        });

        test('should return absolute path', () => {
            const tmpDir = getTmpDir();
            // Path should start with / or drive letter (Windows)
            expect(tmpDir.match(/^(\/|[A-Za-z]:)/)).toBeTruthy();
        });
    });
});
