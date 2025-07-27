"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agent = void 0;
const __typia_transform__validateReport = __importStar(require("typia/lib/internal/_validateReport.js"));
const core_1 = require("@agentica/core");
const openai_1 = __importDefault(require("openai"));
const typia_1 = __importDefault(require("typia"));
const PublicDataService_1 = require("./services/PublicDataService");
const dotenv_1 = __importDefault(require("dotenv"));
// 환경변수 로드
dotenv_1.default.config();
// Gemini API 키 검증
if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required");
}
// OpenAI SDK를 통해 Gemini API 연결
exports.agent = new core_1.Agentica({
    model: "gemini",
    vendor: {
        model: "gemini-1.5-flash",
        api: new openai_1.default({
            apiKey: process.env.GEMINI_API_KEY,
            baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", // Gemini OpenAI 호환 엔드포인트
        }),
    },
    controllers: [
        {
            protocol: "class",
            name: "publicData",
            application: {
                model: "gemini",
                options: {
                    recursive: 3,
                    separate: null
                },
                functions: [
                    {
                        name: "searchData",
                        parameters: {
                            type: "object",
                            properties: {
                                prompt: {
                                    type: "string"
                                }
                            },
                            required: [
                                "prompt"
                            ]
                        },
                        output: {
                            type: "object",
                            properties: {
                                searchYear: {
                                    type: "number",
                                    nullable: true
                                },
                                title: {
                                    type: "string"
                                },
                                keywords: {
                                    type: "string"
                                },
                                classificationSystem: {
                                    type: "string"
                                },
                                providerAgency: {
                                    type: "string"
                                },
                                majorCategory: {
                                    type: "string"
                                },
                                hasDateFilter: {
                                    type: "boolean"
                                },
                                fileDataName: {
                                    type: "string"
                                },
                                fileExtension: {
                                    type: "string"
                                },
                                description: {
                                    type: "string"
                                }
                            },
                            required: [
                                "searchYear",
                                "title",
                                "keywords",
                                "classificationSystem",
                                "providerAgency",
                                "majorCategory",
                                "hasDateFilter"
                            ]
                        },
                        description: "\uAC80\uC0C9 \uD30C\uB77C\uBBF8\uD130 \uCD94\uCD9C (DB \uD544\uB4DC\uBA85 \uB9E4\uD551)",
                        validate: (() => { const _io0 = input => "string" === typeof input.prompt; const _vo0 = (input, _path, _exceptionable = true) => ["string" === typeof input.prompt || _report(_exceptionable, {
                                path: _path + ".prompt",
                                expected: "string",
                                value: input.prompt
                            })].every(flag => flag); const __is = input => "object" === typeof input && null !== input && _io0(input); let errors; let _report; return input => {
                            if (false === __is(input)) {
                                errors = [];
                                _report = __typia_transform__validateReport._validateReport(errors);
                                ((input, _path, _exceptionable = true) => ("object" === typeof input && null !== input || _report(true, {
                                    path: _path + "",
                                    expected: "__type",
                                    value: input
                                })) && _vo0(input, _path + "", true) || _report(true, {
                                    path: _path + "",
                                    expected: "__type",
                                    value: input
                                }))(input, "$input", true);
                                const success = 0 === errors.length;
                                return success ? {
                                    success,
                                    data: input
                                } : {
                                    success,
                                    errors,
                                    data: input
                                };
                            }
                            return {
                                success: true,
                                data: input
                            };
                        }; })()
                    },
                    {
                        name: "recommendData",
                        parameters: {
                            type: "object",
                            properties: {
                                prompt: {
                                    type: "string"
                                },
                                category: {
                                    type: "string"
                                },
                                candidates: {
                                    type: "array",
                                    items: {
                                        type: "string"
                                    }
                                }
                            },
                            required: [
                                "prompt",
                                "category",
                                "candidates"
                            ]
                        },
                        output: {
                            type: "object",
                            properties: {
                                recommendations: {
                                    type: "array",
                                    items: {
                                        type: "string"
                                    }
                                },
                                filteringSteps: {
                                    type: "object",
                                    properties: {
                                        step1_majorCategory: {
                                            type: "string"
                                        },
                                        step2_dateFiltered: {
                                            type: "boolean"
                                        },
                                        step3_finalCount: {
                                            type: "number"
                                        },
                                        dbQueryHints: {
                                            type: "object",
                                            properties: {
                                                majorCategoryFilter: {
                                                    type: "string"
                                                },
                                                yearFilter: {
                                                    type: "number",
                                                    nullable: true
                                                },
                                                keywordFilters: {
                                                    type: "array",
                                                    items: {
                                                        type: "string"
                                                    }
                                                }
                                            },
                                            required: [
                                                "majorCategoryFilter",
                                                "yearFilter",
                                                "keywordFilters"
                                            ]
                                        }
                                    },
                                    required: [
                                        "step1_majorCategory",
                                        "step2_dateFiltered",
                                        "step3_finalCount",
                                        "dbQueryHints"
                                    ]
                                }
                            },
                            required: [
                                "recommendations",
                                "filteringSteps"
                            ]
                        },
                        description: "\uB2E4\uB2E8\uACC4 \uB370\uC774\uD130 \uCD94\uCC9C (DB \uC5F0\uB3D9 \uCD5C\uC801\uD654)",
                        validate: (() => { const _io0 = input => "string" === typeof input.prompt && "string" === typeof input.category && (Array.isArray(input.candidates) && input.candidates.every(elem => "string" === typeof elem)); const _vo0 = (input, _path, _exceptionable = true) => ["string" === typeof input.prompt || _report(_exceptionable, {
                                path: _path + ".prompt",
                                expected: "string",
                                value: input.prompt
                            }), "string" === typeof input.category || _report(_exceptionable, {
                                path: _path + ".category",
                                expected: "string",
                                value: input.category
                            }), (Array.isArray(input.candidates) || _report(_exceptionable, {
                                path: _path + ".candidates",
                                expected: "Array<string>",
                                value: input.candidates
                            })) && input.candidates.map((elem, _index2) => "string" === typeof elem || _report(_exceptionable, {
                                path: _path + ".candidates[" + _index2 + "]",
                                expected: "string",
                                value: elem
                            })).every(flag => flag) || _report(_exceptionable, {
                                path: _path + ".candidates",
                                expected: "Array<string>",
                                value: input.candidates
                            })].every(flag => flag); const __is = input => "object" === typeof input && null !== input && _io0(input); let errors; let _report; return input => {
                            if (false === __is(input)) {
                                errors = [];
                                _report = __typia_transform__validateReport._validateReport(errors);
                                ((input, _path, _exceptionable = true) => ("object" === typeof input && null !== input || _report(true, {
                                    path: _path + "",
                                    expected: "__type",
                                    value: input
                                })) && _vo0(input, _path + "", true) || _report(true, {
                                    path: _path + "",
                                    expected: "__type",
                                    value: input
                                }))(input, "$input", true);
                                const success = 0 === errors.length;
                                return success ? {
                                    success,
                                    data: input
                                } : {
                                    success,
                                    errors,
                                    data: input
                                };
                            }
                            return {
                                success: true,
                                data: input
                            };
                        }; })()
                    }
                ]
            },
            execute: new PublicDataService_1.PublicDataService(),
        },
    ],
});
