import {
  require_jsx_runtime
} from "/assets/_shared/chunk-I7NKL5T4.js";
import {
  AppProvider
} from "/assets/_shared/chunk-BSGQ342U.js";
import {
  require_shopify
} from "/assets/_shared/chunk-7OUBBUAS.js";
import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  Link,
  Outlet,
  useLoaderData
} from "/assets/_shared/chunk-APMZZZMT.js";
import "/assets/_shared/chunk-Z7LCWUX7.js";
import {
  require_jsx_dev_runtime
} from "/assets/_shared/chunk-IFEKMGEG.js";
import {
  require_react
} from "/assets/_shared/chunk-HGNQ3YCE.js";
import {
  createHotContext
} from "/assets/_shared/chunk-GN6N4SDD.js";
import "/assets/_shared/chunk-FK5MLNU6.js";
import {
  __commonJS,
  __toESM
} from "/assets/_shared/chunk-R6OA4XCD.js";

// ../node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "../node_modules/semver/internal/constants.js"(exports, module) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// ../node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "../node_modules/semver/internal/debug.js"(exports, module) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module.exports = debug;
  }
});

// ../node_modules/semver/internal/re.js
var require_re = __commonJS({
  "../node_modules/semver/internal/re.js"(exports, module) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports = module.exports = {};
    var re = exports.re = [];
    var safeRe = exports.safeRe = [];
    var src = exports.src = [];
    var safeSrc = exports.safeSrc = [];
    var t = exports.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// ../node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "../node_modules/semver/internal/parse-options.js"(exports, module) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    };
    module.exports = parseOptions;
  }
});

// ../node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "../node_modules/semver/internal/identifiers.js"(exports, module) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// ../node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "../node_modules/semver/classes/semver.js"(exports, module) {
    "use strict";
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var SemVer = class {
      constructor(version, options) {
        options = parseOptions(options);
        if (version instanceof SemVer) {
          if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof SemVer)) {
          other = new SemVer(other, this.options);
        }
        return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
      }
      comparePre(other) {
        if (!(other instanceof SemVer)) {
          other = new SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof SemVer)) {
          other = new SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
                if (isNaN(this.prerelease[1])) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module.exports = SemVer;
  }
});

// ../node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "../node_modules/semver/functions/parse.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var parse = (version, options, throwErrors = false) => {
      if (version instanceof SemVer) {
        return version;
      }
      try {
        return new SemVer(version, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    };
    module.exports = parse;
  }
});

// ../node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "../node_modules/semver/functions/valid.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var valid = (version, options) => {
      const v = parse(version, options);
      return v ? v.version : null;
    };
    module.exports = valid;
  }
});

// ../node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "../node_modules/semver/functions/clean.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var clean = (version, options) => {
      const s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    };
    module.exports = clean;
  }
});

// ../node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "../node_modules/semver/functions/inc.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var inc = (version, release, options, identifier, identifierBase) => {
      if (typeof options === "string") {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options
        ).inc(release, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    };
    module.exports = inc;
  }
});

// ../node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "../node_modules/semver/functions/diff.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var diff = (version1, version2) => {
      const v1 = parse(version1, null, true);
      const v2 = parse(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return "minor";
          }
          return "patch";
        }
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    };
    module.exports = diff;
  }
});

// ../node_modules/semver/functions/major.js
var require_major = __commonJS({
  "../node_modules/semver/functions/major.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var major = (a, loose) => new SemVer(a, loose).major;
    module.exports = major;
  }
});

// ../node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "../node_modules/semver/functions/minor.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var minor = (a, loose) => new SemVer(a, loose).minor;
    module.exports = minor;
  }
});

// ../node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "../node_modules/semver/functions/patch.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var patch = (a, loose) => new SemVer(a, loose).patch;
    module.exports = patch;
  }
});

// ../node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "../node_modules/semver/functions/prerelease.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var prerelease = (version, options) => {
      const parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module.exports = prerelease;
  }
});

// ../node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "../node_modules/semver/functions/compare.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var compare2 = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module.exports = compare2;
  }
});

// ../node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "../node_modules/semver/functions/rcompare.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var rcompare = (a, b, loose) => compare2(b, a, loose);
    module.exports = rcompare;
  }
});

// ../node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "../node_modules/semver/functions/compare-loose.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var compareLoose = (a, b) => compare2(a, b, true);
    module.exports = compareLoose;
  }
});

// ../node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "../node_modules/semver/functions/compare-build.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var compareBuild = (a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module.exports = compareBuild;
  }
});

// ../node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "../node_modules/semver/functions/sort.js"(exports, module) {
    "use strict";
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module.exports = sort;
  }
});

// ../node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "../node_modules/semver/functions/rsort.js"(exports, module) {
    "use strict";
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module.exports = rsort;
  }
});

// ../node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "../node_modules/semver/functions/gt.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var gt = (a, b, loose) => compare2(a, b, loose) > 0;
    module.exports = gt;
  }
});

// ../node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "../node_modules/semver/functions/lt.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var lt = (a, b, loose) => compare2(a, b, loose) < 0;
    module.exports = lt;
  }
});

// ../node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "../node_modules/semver/functions/eq.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var eq = (a, b, loose) => compare2(a, b, loose) === 0;
    module.exports = eq;
  }
});

// ../node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "../node_modules/semver/functions/neq.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var neq = (a, b, loose) => compare2(a, b, loose) !== 0;
    module.exports = neq;
  }
});

// ../node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "../node_modules/semver/functions/gte.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var gte = (a, b, loose) => compare2(a, b, loose) >= 0;
    module.exports = gte;
  }
});

// ../node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "../node_modules/semver/functions/lte.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var lte = (a, b, loose) => compare2(a, b, loose) <= 0;
    module.exports = lte;
  }
});

// ../node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "../node_modules/semver/functions/cmp.js"(exports, module) {
    "use strict";
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = (a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module.exports = cmp;
  }
});

// ../node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "../node_modules/semver/functions/coerce.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var parse = require_parse();
    var { safeRe: re, t } = require_re();
    var coerce = (version, options) => {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === "number") {
        version = String(version);
      }
      if (typeof version !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
      } else {
        const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    };
    module.exports = coerce;
  }
});

// ../node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "../node_modules/semver/internal/lrucache.js"(exports, module) {
    "use strict";
    var LRUCache = class {
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module.exports = LRUCache;
  }
});

// ../node_modules/semver/classes/range.js
var require_range = __commonJS({
  "../node_modules/semver/classes/range.js"(exports, module) {
    "use strict";
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class {
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        debug("tilde trim", range);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version) {
        if (!version) {
          return false;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var isNullSet = (c) => c.value === "<0.0.0-0";
    var isAny = (c) => c.value === "";
    var isSatisfiable = (comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options) => {
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
    var replaceTildes = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
    };
    var replaceTilde = (comp, options) => {
      const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
    };
    var replaceCaret = (comp, options) => {
      debug("caret", comp, options);
      const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options) => {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
    };
    var replaceXRange = (comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    };
    var replaceStars = (comp, options) => {
      debug("replaceStars", comp, options);
      return comp.trim().replace(re[t.STAR], "");
    };
    var replaceGTE0 = (comp, options) => {
      debug("replaceGTE0", comp, options);
      return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    };
    var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    };
    var testSet = (set, version, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  }
});

// ../node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "../node_modules/semver/classes/comparator.js"(exports, module) {
    "use strict";
    var ANY = Symbol("SemVer ANY");
    var Comparator = class {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version) {
        debug("Comparator.test", version, this.options.loose);
        if (this.semver === ANY || version === ANY) {
          return true;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// ../node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "../node_modules/semver/functions/satisfies.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var satisfies = (version, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version);
    };
    module.exports = satisfies;
  }
});

// ../node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "../node_modules/semver/ranges/to-comparators.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module.exports = toComparators;
  }
});

// ../node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "../node_modules/semver/ranges/max-satisfying.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = (versions, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    };
    module.exports = maxSatisfying;
  }
});

// ../node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "../node_modules/semver/ranges/min-satisfying.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = (versions, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    };
    module.exports = minSatisfying;
  }
});

// ../node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "../node_modules/semver/ranges/min-version.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            case "":
            case ">=":
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    };
    module.exports = minVersion;
  }
});

// ../node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "../node_modules/semver/ranges/valid.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var validRange = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    };
    module.exports = validRange;
  }
});

// ../node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "../node_modules/semver/ranges/outside.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = (version, range, hilo, options) => {
      version = new SemVer(version, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    };
    module.exports = outside;
  }
});

// ../node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "../node_modules/semver/ranges/gtr.js"(exports, module) {
    "use strict";
    var outside = require_outside();
    var gtr = (version, range, options) => outside(version, range, ">", options);
    module.exports = gtr;
  }
});

// ../node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "../node_modules/semver/ranges/ltr.js"(exports, module) {
    "use strict";
    var outside = require_outside();
    var ltr = (version, range, options) => outside(version, range, "<", options);
    module.exports = ltr;
  }
});

// ../node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "../node_modules/semver/ranges/intersects.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var intersects = (r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    };
    module.exports = intersects;
  }
});

// ../node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "../node_modules/semver/ranges/simplify.js"(exports, module) {
    "use strict";
    var satisfies = require_satisfies();
    var compare2 = require_compare();
    module.exports = (versions, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions.sort((a, b) => compare2(a, b, options));
      for (const version of v) {
        const included = satisfies(version, range, options);
        if (included) {
          prev = version;
          if (!first) {
            first = version;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// ../node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "../node_modules/semver/ranges/subset.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare2 = require_compare();
    var subset = (sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER:
        for (const simpleSub of sub.set) {
          for (const simpleDom of dom.set) {
            const isSub = simpleSubset(simpleSub, simpleDom, options);
            sawNonNull = sawNonNull || isSub !== null;
            if (isSub) {
              continue OUTER;
            }
          }
          if (sawNonNull) {
            return false;
          }
        }
      return true;
    };
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = (sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt = higherGT(gt, c, options);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt = lowerLT(lt, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare2(gt.semver, lt.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
      let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt, c, options);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (gt.operator === ">=" && !satisfies(gt.semver, String(c), options)) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt, c, options);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (lt.operator === "<=" && !satisfies(lt.semver, String(c), options)) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    };
    var higherGT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare2(a.semver, b.semver, options);
      return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
    };
    var lowerLT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare2(a.semver, b.semver, options);
      return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
    };
    module.exports = subset;
  }
});

// ../node_modules/semver/index.js
var require_semver2 = __commonJS({
  "../node_modules/semver/index.js"(exports, module) {
    "use strict";
    var internalRe = require_re();
    var constants = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare2 = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt = require_gt();
    var lt = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare: compare2,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// app/routes/app.tsx
var import_node = __toESM(require_node());

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/runtime/crypto/crypto.mjs
var cryptoVar;
try {
  cryptoVar = crypto;
} catch (_e) {
}

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/runtime/crypto/types.mjs
var HashFormat;
(function(HashFormat2) {
  HashFormat2["Base64"] = "base64";
  HashFormat2["Hex"] = "hex";
})(HashFormat || (HashFormat = {}));

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/runtime/http/index.mjs
var abstractFetch = () => {
  throw new Error("Missing adapter implementation for 'abstractFetch' - make sure to import the appropriate adapter for your platform");
};
function setAbstractFetchFunc(func) {
  abstractFetch = func;
}
var abstractConvertRequest = () => {
  throw new Error("Missing adapter implementation for 'abstractConvertRequest' - make sure to import the appropriate adapter for your platform");
};
function setAbstractConvertRequestFunc(func) {
  abstractConvertRequest = func;
}
var abstractConvertResponse = () => {
  throw new Error("Missing adapter implementation for 'abstractConvertResponse' - make sure to import the appropriate adapter for your platform");
};
function setAbstractConvertResponseFunc(func) {
  abstractConvertResponse = func;
}
var abstractConvertHeaders = () => {
  throw new Error("Missing adapter implementation for 'abstractConvertHeaders' - make sure to import the appropriate adapter for your platform");
};
function setAbstractConvertHeadersFunc(func) {
  abstractConvertHeaders = func;
}

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/runtime/platform/runtime-string.mjs
var abstractRuntimeString = () => {
  throw new Error("Missing adapter implementation for 'abstractRuntimeString' - make sure to import the appropriate adapter for your platform");
};
function setAbstractRuntimeString(func) {
  abstractRuntimeString = func;
}

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/runtime/http/headers.mjs
function canonicalizeHeaderName(hdr) {
  return hdr.replace(/(^|-)(\w+)/g, (_fullMatch, start, letters) => start + letters.slice(0, 1).toUpperCase() + letters.slice(1).toLowerCase());
}
function getHeaders(headers, needle_) {
  const result = [];
  if (!headers)
    return result;
  const needle = canonicalizeHeaderName(needle_);
  for (const [key, values] of Object.entries(headers)) {
    if (canonicalizeHeaderName(key) !== needle)
      continue;
    if (Array.isArray(values)) {
      result.push(...values);
    } else {
      result.push(values);
    }
  }
  return result;
}
function getHeader(headers, needle) {
  if (!headers)
    return void 0;
  return getHeaders(headers, needle)?.[0];
}
function addHeader(headers, key, value) {
  canonicalizeHeaders(headers);
  const canonKey = canonicalizeHeaderName(key);
  let list = headers[canonKey];
  if (!list) {
    list = [];
  } else if (!Array.isArray(list)) {
    list = [list];
  }
  headers[canonKey] = list;
  list.push(value);
}
function canonicalizeValue(value) {
  if (typeof value === "number")
    return value.toString();
  return value;
}
function canonicalizeHeaders(hdr) {
  for (const [key, values] of Object.entries(hdr)) {
    const canonKey = canonicalizeHeaderName(key);
    if (!hdr[canonKey])
      hdr[canonKey] = [];
    if (!Array.isArray(hdr[canonKey]))
      hdr[canonKey] = [canonicalizeValue(hdr[canonKey])];
    if (key === canonKey)
      continue;
    delete hdr[key];
    hdr[canonKey].push(...[values].flat().map((value) => canonicalizeValue(value)));
  }
  return hdr;
}
function flatHeaders(headers) {
  return Object.entries(headers).flatMap(([header, values]) => Array.isArray(values) ? values.map((value) => [header, value]) : [[header, values]]);
}

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/adapters/web-api/adapter.mjs
async function webApiConvertRequest(adapterArgs) {
  const request2 = adapterArgs.rawRequest;
  const headers = {};
  for (const [key, value] of request2.headers.entries()) {
    addHeader(headers, key, value);
  }
  return {
    headers,
    method: request2.method ?? "GET",
    url: new URL(request2.url).toString()
  };
}
async function webApiConvertHeaders(headers, _adapterArgs) {
  const remixHeaders = new Headers();
  flatHeaders(headers ?? {}).forEach(([key, value]) => remixHeaders.append(key, value));
  return Promise.resolve(remixHeaders);
}
async function webApiConvertResponse(resp, adapterArgs) {
  return new Response(resp.body, {
    status: resp.statusCode,
    statusText: resp.statusText,
    headers: await webApiConvertHeaders(resp.headers ?? {})
  });
}
function webApiRuntimeString() {
  return "Web API";
}

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/adapters/web-api/index.mjs
setAbstractFetchFunc(fetch);
setAbstractConvertRequestFunc(webApiConvertRequest);
setAbstractConvertResponseFunc(webApiConvertResponse);
setAbstractConvertHeadersFunc(webApiConvertHeaders);
setAbstractRuntimeString(webApiRuntimeString);

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/lib/error.mjs
var ShopifyError = class extends Error {
  constructor(...args) {
    super(...args);
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var HttpRequestError = class extends ShopifyError {
};
var HttpMaxRetriesError = class extends ShopifyError {
};
var HttpResponseError = class extends ShopifyError {
  constructor({ message, code, statusText, body, headers }) {
    super(message);
    this.response = {
      code,
      statusText,
      body,
      headers
    };
  }
};
var HttpRetriableError = class extends HttpResponseError {
};
var HttpInternalError = class extends HttpRetriableError {
};
var HttpThrottlingError = class extends HttpRetriableError {
  constructor({ retryAfter, ...params }) {
    super(params);
    this.response.retryAfter = retryAfter;
  }
};
var GraphqlQueryError = class extends ShopifyError {
  constructor({ message, response, headers, body }) {
    super(message);
    this.response = response;
    this.headers = headers;
    this.body = body;
  }
};
var MissingRequiredArgument = class extends ShopifyError {
};
var InvalidRequestError = class extends ShopifyError {
};
var FeatureDeprecatedError = class extends ShopifyError {
};

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/runtime/crypto/utils.mjs
async function createSHA256HMAC(secret, payload, returnFormat = HashFormat.Base64) {
  const cryptoLib = typeof cryptoVar?.webcrypto === "undefined" ? cryptoVar : cryptoVar.webcrypto;
  const enc = new TextEncoder();
  const key = await cryptoLib.subtle.importKey("raw", enc.encode(secret), {
    name: "HMAC",
    hash: { name: "SHA-256" }
  }, false, ["sign"]);
  const signature = await cryptoLib.subtle.sign("HMAC", key, enc.encode(payload));
  return returnFormat === HashFormat.Base64 ? asBase64(signature) : asHex(signature);
}
function asHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
var LookupTable = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
function asBase64(buffer) {
  let output = "";
  const input = new Uint8Array(buffer);
  for (let i = 0; i < input.length; ) {
    const byte1 = input[i++];
    const byte2 = input[i++];
    const byte3 = input[i++];
    const enc1 = byte1 >> 2;
    const enc2 = (byte1 & 3) << 4 | byte2 >> 4;
    let enc3 = (byte2 & 15) << 2 | byte3 >> 6;
    let enc4 = byte3 & 63;
    if (isNaN(byte2)) {
      enc3 = 64;
    }
    if (isNaN(byte3)) {
      enc4 = 64;
    }
    output += LookupTable[enc1] + LookupTable[enc2] + LookupTable[enc3] + LookupTable[enc4];
  }
  return output;
}

// ../node_modules/compare-versions/lib/esm/utils.js
var semver = /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;
var validateAndParse = (version) => {
  if (typeof version !== "string") {
    throw new TypeError("Invalid argument expected string");
  }
  const match = version.match(semver);
  if (!match) {
    throw new Error(`Invalid argument not valid semver ('${version}' received)`);
  }
  match.shift();
  return match;
};
var isWildcard = (s) => s === "*" || s === "x" || s === "X";
var tryParse = (v) => {
  const n = parseInt(v, 10);
  return isNaN(n) ? v : n;
};
var forceType = (a, b) => typeof a !== typeof b ? [String(a), String(b)] : [a, b];
var compareStrings = (a, b) => {
  if (isWildcard(a) || isWildcard(b))
    return 0;
  const [ap, bp] = forceType(tryParse(a), tryParse(b));
  if (ap > bp)
    return 1;
  if (ap < bp)
    return -1;
  return 0;
};
var compareSegments = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const r = compareStrings(a[i] || "0", b[i] || "0");
    if (r !== 0)
      return r;
  }
  return 0;
};

// ../node_modules/compare-versions/lib/esm/compareVersions.js
var compareVersions = (v1, v2) => {
  const n1 = validateAndParse(v1);
  const n2 = validateAndParse(v2);
  const p1 = n1.pop();
  const p2 = n2.pop();
  const r = compareSegments(n1, n2);
  if (r !== 0)
    return r;
  if (p1 && p2) {
    return compareSegments(p1.split("."), p2.split("."));
  } else if (p1 || p2) {
    return p1 ? -1 : 1;
  }
  return 0;
};

// ../node_modules/compare-versions/lib/esm/compare.js
var compare = (v1, v2, operator) => {
  assertValidOperator(operator);
  const res = compareVersions(v1, v2);
  return operatorResMap[operator].includes(res);
};
var operatorResMap = {
  ">": [1],
  ">=": [0, 1],
  "=": [0],
  "<=": [-1, 0],
  "<": [-1],
  "!=": [-1, 1]
};
var allowedOperators = Object.keys(operatorResMap);
var assertValidOperator = (op) => {
  if (typeof op !== "string") {
    throw new TypeError(`Invalid operator type, expected string but got ${typeof op}`);
  }
  if (allowedOperators.indexOf(op) === -1) {
    throw new Error(`Invalid operator, expected one of ${allowedOperators.join("|")}`);
  }
};

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/lib/types.mjs
var LogSeverity;
(function(LogSeverity2) {
  LogSeverity2[LogSeverity2["Error"] = 0] = "Error";
  LogSeverity2[LogSeverity2["Warning"] = 1] = "Warning";
  LogSeverity2[LogSeverity2["Info"] = 2] = "Info";
  LogSeverity2[LogSeverity2["Debug"] = 3] = "Debug";
})(LogSeverity || (LogSeverity = {}));
var ApiVersion;
(function(ApiVersion2) {
  ApiVersion2["October22"] = "2022-10";
  ApiVersion2["January23"] = "2023-01";
  ApiVersion2["April23"] = "2023-04";
  ApiVersion2["July23"] = "2023-07";
  ApiVersion2["October23"] = "2023-10";
  ApiVersion2["January24"] = "2024-01";
  ApiVersion2["April24"] = "2024-04";
  ApiVersion2["Unstable"] = "unstable";
})(ApiVersion || (ApiVersion = {}));
var LIBRARY_NAME = "Shopify API Library";
var LATEST_API_VERSION = ApiVersion.April24;
var ShopifyHeader;
(function(ShopifyHeader2) {
  ShopifyHeader2["AccessToken"] = "X-Shopify-Access-Token";
  ShopifyHeader2["ApiVersion"] = "X-Shopify-API-Version";
  ShopifyHeader2["Domain"] = "X-Shopify-Shop-Domain";
  ShopifyHeader2["Hmac"] = "X-Shopify-Hmac-Sha256";
  ShopifyHeader2["Topic"] = "X-Shopify-Topic";
  ShopifyHeader2["SubTopic"] = "X-Shopify-Sub-Topic";
  ShopifyHeader2["WebhookId"] = "X-Shopify-Webhook-Id";
  ShopifyHeader2["StorefrontPrivateToken"] = "Shopify-Storefront-Private-Token";
  ShopifyHeader2["StorefrontSDKVariant"] = "X-SDK-Variant";
  ShopifyHeader2["StorefrontSDKVersion"] = "X-SDK-Version";
})(ShopifyHeader || (ShopifyHeader = {}));
var ClientType;
(function(ClientType2) {
  ClientType2["Rest"] = "rest";
  ClientType2["Graphql"] = "graphql";
})(ClientType || (ClientType = {}));
var BillingInterval;
(function(BillingInterval2) {
  BillingInterval2["OneTime"] = "ONE_TIME";
  BillingInterval2["Every30Days"] = "EVERY_30_DAYS";
  BillingInterval2["Annual"] = "ANNUAL";
  BillingInterval2["Usage"] = "USAGE";
})(BillingInterval || (BillingInterval = {}));
var BillingReplacementBehavior;
(function(BillingReplacementBehavior2) {
  BillingReplacementBehavior2["ApplyImmediately"] = "APPLY_IMMEDIATELY";
  BillingReplacementBehavior2["ApplyOnNextBillingCycle"] = "APPLY_ON_NEXT_BILLING_CYCLE";
  BillingReplacementBehavior2["Standard"] = "STANDARD";
})(BillingReplacementBehavior || (BillingReplacementBehavior = {}));

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/lib/version.mjs
var SHOPIFY_API_LIBRARY_VERSION = "10.0.0";

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/lib/logger/log.mjs
function log(config) {
  return function(severity, message, context = {}) {
    if (severity > config.logger.level) {
      return;
    }
    const prefix = [];
    if (config.logger.timestamps) {
      prefix.push(`${(/* @__PURE__ */ new Date()).toISOString().slice(0, -5)}Z`);
    }
    let packageString = context.package || "shopify-api";
    delete context.package;
    switch (severity) {
      case LogSeverity.Debug:
        packageString = `${packageString}/DEBUG`;
        break;
      case LogSeverity.Info:
        packageString = `${packageString}/INFO`;
        break;
      case LogSeverity.Warning:
        packageString = `${packageString}/WARNING`;
        break;
      case LogSeverity.Error:
        packageString = `${packageString}/ERROR`;
        break;
    }
    prefix.push(packageString);
    const contextParts = [];
    Object.entries(context).forEach(([key, value]) => {
      contextParts.push(`${key}: ${value}`);
    });
    let suffix = "";
    if (contextParts.length > 0) {
      suffix = ` | {${contextParts.join(", ")}}`;
    }
    config.logger.log(severity, `[${prefix.join("] [")}] ${message}${suffix}`);
  };
}

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/lib/logger/index.mjs
function logger(config) {
  const logFunction = log(config);
  return {
    log: logFunction,
    debug: async (message, context = {}) => logFunction(LogSeverity.Debug, message, context),
    info: async (message, context = {}) => logFunction(LogSeverity.Info, message, context),
    warning: async (message, context = {}) => logFunction(LogSeverity.Warning, message, context),
    error: async (message, context = {}) => logFunction(LogSeverity.Error, message, context),
    deprecated: deprecated(logFunction)
  };
}
function deprecated(logFunction) {
  return function(version, message) {
    if (compare(SHOPIFY_API_LIBRARY_VERSION, version, ">=")) {
      throw new FeatureDeprecatedError(`Feature was deprecated in version ${version}`);
    }
    return logFunction(LogSeverity.Warning, `[Deprecated | ${version}] ${message}`);
  };
}

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/lib/auth/scopes/index.mjs
var AuthScopes = class {
  constructor(scopes) {
    let scopesArray = [];
    if (typeof scopes === "string") {
      scopesArray = scopes.split(new RegExp(`${AuthScopes.SCOPE_DELIMITER}\\s*`));
    } else if (Array.isArray(scopes)) {
      scopesArray = scopes;
    } else if (scopes) {
      scopesArray = Array.from(scopes.expandedScopes);
    }
    scopesArray = scopesArray.map((scope) => scope.trim()).filter((scope) => scope.length);
    const impliedScopes = this.getImpliedScopes(scopesArray);
    const scopeSet = new Set(scopesArray);
    const impliedSet = new Set(impliedScopes);
    this.compressedScopes = new Set([...scopeSet].filter((x) => !impliedSet.has(x)));
    this.expandedScopes = /* @__PURE__ */ new Set([...scopeSet, ...impliedSet]);
  }
  /**
   * Checks whether the current set of scopes includes the given one.
   */
  has(scope) {
    let other;
    if (scope instanceof AuthScopes) {
      other = scope;
    } else {
      other = new AuthScopes(scope);
    }
    return other.toArray().filter((x) => !this.expandedScopes.has(x)).length === 0;
  }
  /**
   * Checks whether the current set of scopes equals the given one.
   */
  equals(otherScopes) {
    let other;
    if (otherScopes instanceof AuthScopes) {
      other = otherScopes;
    } else {
      other = new AuthScopes(otherScopes);
    }
    return this.compressedScopes.size === other.compressedScopes.size && this.toArray().filter((x) => !other.has(x)).length === 0;
  }
  /**
   * Returns a comma-separated string with the current set of scopes.
   */
  toString() {
    return this.toArray().join(AuthScopes.SCOPE_DELIMITER);
  }
  /**
   * Returns an array with the current set of scopes.
   */
  toArray() {
    return [...this.compressedScopes];
  }
  getImpliedScopes(scopesArray) {
    return scopesArray.reduce((array, current) => {
      const matches = current.match(/^(unauthenticated_)?write_(.*)$/);
      if (matches) {
        array.push(`${matches[1] ? matches[1] : ""}read_${matches[2]}`);
      }
      return array;
    }, []);
  }
};
AuthScopes.SCOPE_DELIMITER = ",";

// ../node_modules/@shopify/graphql-client/dist/graphql-client/constants.mjs
var CLIENT = "GraphQL Client";
var MIN_RETRIES = 0;
var MAX_RETRIES = 3;
var RETRY_WAIT_TIME = 1e3;
var RETRIABLE_STATUS_CODES = [429, 503];
var NEWLINE_SEPARATOR = "\r\n";
var HEADER_SEPARATOR = NEWLINE_SEPARATOR + NEWLINE_SEPARATOR;

// ../node_modules/@shopify/graphql-client/dist/graphql-client/utilities.mjs
function formatErrorMessage(message, client = CLIENT) {
  return message.startsWith(`${client}`) ? message : `${client}: ${message}`;
}
function getErrorMessage(error) {
  return error instanceof Error ? error.message : JSON.stringify(error);
}
function validateRetries({ client, retries }) {
  if (retries !== void 0 && (typeof retries !== "number" || retries < MIN_RETRIES || retries > MAX_RETRIES)) {
    throw new Error(`${client}: The provided "retries" value (${retries}) is invalid - it cannot be less than ${MIN_RETRIES} or greater than ${MAX_RETRIES}`);
  }
}

// ../node_modules/@shopify/graphql-client/dist/graphql-client/http-fetch.mjs
function generateHttpFetch({ clientLogger, customFetchApi = fetch, client = CLIENT, defaultRetryWaitTime = RETRY_WAIT_TIME, retriableCodes = RETRIABLE_STATUS_CODES }) {
  const httpFetch = async (requestParams, count, maxRetries) => {
    const nextCount = count + 1;
    const maxTries = maxRetries + 1;
    let response;
    try {
      response = await customFetchApi(...requestParams);
      clientLogger({
        type: "HTTP-Response",
        content: {
          requestParams,
          response
        }
      });
      if (!response.ok && retriableCodes.includes(response.status) && nextCount <= maxTries) {
        throw new Error();
      }
      return response;
    } catch (error) {
      if (nextCount <= maxTries) {
        const retryAfter = response?.headers.get("Retry-After");
        await sleep(retryAfter ? parseInt(retryAfter, 10) : defaultRetryWaitTime);
        clientLogger({
          type: "HTTP-Retry",
          content: {
            requestParams,
            lastResponse: response,
            retryAttempt: count,
            maxRetries
          }
        });
        return httpFetch(requestParams, nextCount, maxRetries);
      }
      throw new Error(formatErrorMessage(`${maxRetries > 0 ? `Attempted maximum number of ${maxRetries} network retries. Last message - ` : ""}${getErrorMessage(error)}`, client));
    }
  };
  return httpFetch;
}
async function sleep(waitTime) {
  return new Promise((resolve) => setTimeout(resolve, waitTime));
}

// ../node_modules/@shopify/graphql-client/dist/api-client-utilities/validations.mjs
function validateDomainAndGetStoreUrl({ client, storeDomain }) {
  try {
    if (!storeDomain || typeof storeDomain !== "string") {
      throw new Error();
    }
    const trimmedDomain = storeDomain.trim();
    const protocolUrl = trimmedDomain.match(/^https?:/) ? trimmedDomain : `https://${trimmedDomain}`;
    const url = new URL(protocolUrl);
    url.protocol = "https";
    return url.origin;
  } catch (_error) {
    throw new Error(`${client}: a valid store domain ("${storeDomain}") must be provided`);
  }
}
function validateApiVersion({ client, currentSupportedApiVersions, apiVersion, logger: logger2 }) {
  const versionError = `${client}: the provided apiVersion ("${apiVersion}")`;
  const supportedVersion = `Currently supported API versions: ${currentSupportedApiVersions.join(", ")}`;
  if (!apiVersion || typeof apiVersion !== "string") {
    throw new Error(`${versionError} is invalid. ${supportedVersion}`);
  }
  const trimmedApiVersion = apiVersion.trim();
  if (!currentSupportedApiVersions.includes(trimmedApiVersion)) {
    if (logger2) {
      logger2({
        type: "Unsupported_Api_Version",
        content: {
          apiVersion,
          supportedApiVersions: currentSupportedApiVersions
        }
      });
    } else {
      console.warn(`${versionError} is likely deprecated or not supported. ${supportedVersion}`);
    }
  }
}

// ../node_modules/@shopify/graphql-client/dist/api-client-utilities/api-versions.mjs
function getQuarterMonth(quarter) {
  const month = quarter * 3 - 2;
  return month === 10 ? month : `0${month}`;
}
function getPrevousVersion(year, quarter, nQuarter) {
  const versionQuarter = quarter - nQuarter;
  if (versionQuarter <= 0) {
    return `${year - 1}-${getQuarterMonth(versionQuarter + 4)}`;
  }
  return `${year}-${getQuarterMonth(versionQuarter)}`;
}
function getCurrentApiVersion() {
  const date = /* @__PURE__ */ new Date();
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();
  const quarter = Math.floor(month / 3 + 1);
  return {
    year,
    quarter,
    version: `${year}-${getQuarterMonth(quarter)}`
  };
}
function getCurrentSupportedApiVersions() {
  const { year, quarter, version: currentVersion } = getCurrentApiVersion();
  const nextVersion = quarter === 4 ? `${year + 1}-01` : `${year}-${getQuarterMonth(quarter + 1)}`;
  return [
    getPrevousVersion(year, quarter, 3),
    getPrevousVersion(year, quarter, 2),
    getPrevousVersion(year, quarter, 1),
    currentVersion,
    nextVersion,
    "unstable"
  ];
}

// ../node_modules/@shopify/admin-api-client/dist/constants.mjs
var DEFAULT_CONTENT_TYPE = "application/json";
var DEFAULT_CLIENT_VERSION2 = "0.2.9";
var ACCESS_TOKEN_HEADER = "X-Shopify-Access-Token";
var CLIENT2 = "Admin API Client";
var RETRIABLE_STATUS_CODES2 = [429, 500, 503];
var DEFAULT_RETRY_WAIT_TIME = 1e3;

// ../node_modules/@shopify/admin-api-client/dist/validations.mjs
function validateRequiredAccessToken(accessToken) {
  if (!accessToken) {
    throw new Error(`${CLIENT2}: an access token must be provided`);
  }
}
function validateServerSideUsage() {
  if (typeof window !== "undefined") {
    throw new Error(`${CLIENT2}: this client should not be used in the browser`);
  }
}

// ../node_modules/@shopify/admin-api-client/dist/rest/types.mjs
var Method;
(function(Method3) {
  Method3["Get"] = "GET";
  Method3["Post"] = "POST";
  Method3["Put"] = "PUT";
  Method3["Delete"] = "DELETE";
})(Method || (Method = {}));

// ../node_modules/@shopify/admin-api-client/dist/rest/client.mjs
function createAdminRestApiClient({ storeDomain, apiVersion, accessToken, userAgentPrefix, logger: logger2, customFetchApi = fetch, retries: clientRetries = 0, scheme = "https", defaultRetryTime = DEFAULT_RETRY_WAIT_TIME, formatPaths = true }) {
  const currentSupportedApiVersions = getCurrentSupportedApiVersions();
  const storeUrl = validateDomainAndGetStoreUrl({
    client: CLIENT2,
    storeDomain
  }).replace("https://", `${scheme}://`);
  const baseApiVersionValidationParams = {
    client: CLIENT2,
    currentSupportedApiVersions,
    logger: logger2
  };
  validateServerSideUsage();
  validateApiVersion({
    client: CLIENT2,
    currentSupportedApiVersions,
    apiVersion,
    logger: logger2
  });
  validateRequiredAccessToken(accessToken);
  validateRetries({ client: CLIENT2, retries: clientRetries });
  const apiUrlFormatter = generateApiUrlFormatter(storeUrl, apiVersion, baseApiVersionValidationParams, formatPaths);
  const clientLogger = generateClientLogger(logger2);
  const httpFetch = generateHttpFetch({
    customFetchApi,
    clientLogger,
    defaultRetryWaitTime: defaultRetryTime,
    client: CLIENT2,
    retriableCodes: RETRIABLE_STATUS_CODES2
  });
  const request2 = async (path, { method, data, headers: requestHeadersObj, searchParams, retries = 0, apiVersion: apiVersion2 }) => {
    validateRetries({ client: CLIENT2, retries });
    const url = apiUrlFormatter(path, searchParams ?? {}, apiVersion2);
    const requestHeaders = normalizedHeaders(requestHeadersObj ?? {});
    const userAgent = [
      ...requestHeaders["user-agent"] ? [requestHeaders["user-agent"]] : [],
      ...userAgentPrefix ? [userAgentPrefix] : [],
      `${CLIENT2} v${DEFAULT_CLIENT_VERSION2}`
    ].join(" | ");
    const headers = normalizedHeaders({
      "Content-Type": DEFAULT_CONTENT_TYPE,
      ...requestHeaders,
      Accept: DEFAULT_CONTENT_TYPE,
      [ACCESS_TOKEN_HEADER]: accessToken,
      "User-Agent": userAgent
    });
    const body = data && typeof data !== "string" ? JSON.stringify(data) : data;
    return httpFetch([url, { method, headers, ...body ? { body } : void 0 }], 1, retries ?? clientRetries);
  };
  return {
    get: (path, options) => request2(path, { method: Method.Get, ...options }),
    put: (path, options) => request2(path, { method: Method.Put, ...options }),
    post: (path, options) => request2(path, { method: Method.Post, ...options }),
    delete: (path, options) => request2(path, { method: Method.Delete, ...options })
  };
}
function generateApiUrlFormatter(storeUrl, defaultApiVersion, baseApiVersionValidationParams, formatPaths = true) {
  return (path, searchParams, apiVersion) => {
    if (apiVersion) {
      validateApiVersion({
        ...baseApiVersionValidationParams,
        apiVersion
      });
    }
    function convertValue(params2, key, value) {
      if (Array.isArray(value)) {
        value.forEach((arrayValue) => convertValue(params2, `${key}[]`, arrayValue));
        return;
      } else if (typeof value === "object") {
        Object.entries(value).forEach(([objKey, objValue]) => convertValue(params2, `${key}[${objKey}]`, objValue));
        return;
      }
      params2.append(key, String(value));
    }
    const urlApiVersion = (apiVersion ?? defaultApiVersion).trim();
    let cleanPath = path.replace(/^\//, "");
    if (formatPaths) {
      if (!cleanPath.startsWith("admin")) {
        cleanPath = `admin/api/${urlApiVersion}/${cleanPath}`;
      }
      if (!cleanPath.endsWith(".json")) {
        cleanPath = `${cleanPath}.json`;
      }
    }
    const params = new URLSearchParams();
    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        convertValue(params, key, value);
      }
    }
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return `${storeUrl}/${cleanPath}${queryString}`;
  };
}
function generateClientLogger(logger2) {
  return (logContent) => {
    if (logger2) {
      logger2(logContent);
    }
  };
}
function normalizedHeaders(headersObj) {
  const normalizedHeaders2 = {};
  for (const [key, value] of Object.entries(headersObj)) {
    normalizedHeaders2[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
  }
  return normalizedHeaders2;
}

// ../node_modules/@shopify/network/build/esm/network.mjs
var Method2;
(function(Method3) {
  Method3["Get"] = "GET";
  Method3["Post"] = "POST";
  Method3["Put"] = "PUT";
  Method3["Patch"] = "PATCH";
  Method3["Delete"] = "DELETE";
  Method3["Head"] = "HEAD";
  Method3["Options"] = "OPTIONS";
  Method3["Connect"] = "CONNECT";
})(Method2 || (Method2 = {}));
var StatusCode;
(function(StatusCode2) {
  StatusCode2[StatusCode2["Continue"] = 100] = "Continue";
  StatusCode2[StatusCode2["SwitchingProtocols"] = 101] = "SwitchingProtocols";
  StatusCode2[StatusCode2["Ok"] = 200] = "Ok";
  StatusCode2[StatusCode2["Created"] = 201] = "Created";
  StatusCode2[StatusCode2["Accepted"] = 202] = "Accepted";
  StatusCode2[StatusCode2["NonAuthoritativeInformation"] = 203] = "NonAuthoritativeInformation";
  StatusCode2[StatusCode2["NoContent"] = 204] = "NoContent";
  StatusCode2[StatusCode2["ResetContent"] = 205] = "ResetContent";
  StatusCode2[StatusCode2["PartialContent"] = 206] = "PartialContent";
  StatusCode2[StatusCode2["MultipleChoices"] = 300] = "MultipleChoices";
  StatusCode2[StatusCode2["MovedPermanently"] = 301] = "MovedPermanently";
  StatusCode2[StatusCode2["Found"] = 302] = "Found";
  StatusCode2[StatusCode2["SeeOther"] = 303] = "SeeOther";
  StatusCode2[StatusCode2["NotModified"] = 304] = "NotModified";
  StatusCode2[StatusCode2["UseProxy"] = 305] = "UseProxy";
  StatusCode2[StatusCode2["TemporaryRedirect"] = 307] = "TemporaryRedirect";
  StatusCode2[StatusCode2["BadRequest"] = 400] = "BadRequest";
  StatusCode2[StatusCode2["Unauthorized"] = 401] = "Unauthorized";
  StatusCode2[StatusCode2["PaymentRequired"] = 402] = "PaymentRequired";
  StatusCode2[StatusCode2["Forbidden"] = 403] = "Forbidden";
  StatusCode2[StatusCode2["NotFound"] = 404] = "NotFound";
  StatusCode2[StatusCode2["MethodNotAllowed"] = 405] = "MethodNotAllowed";
  StatusCode2[StatusCode2["NotAcceptable"] = 406] = "NotAcceptable";
  StatusCode2[StatusCode2["ProxyAuthenticationRequired"] = 407] = "ProxyAuthenticationRequired";
  StatusCode2[StatusCode2["RequestTimeout"] = 408] = "RequestTimeout";
  StatusCode2[StatusCode2["Conflict"] = 409] = "Conflict";
  StatusCode2[StatusCode2["Gone"] = 410] = "Gone";
  StatusCode2[StatusCode2["LengthRequired"] = 411] = "LengthRequired";
  StatusCode2[StatusCode2["PreconditionFailed"] = 412] = "PreconditionFailed";
  StatusCode2[StatusCode2["RequestEntityTooLarge"] = 413] = "RequestEntityTooLarge";
  StatusCode2[StatusCode2["RequestUriTooLong"] = 414] = "RequestUriTooLong";
  StatusCode2[StatusCode2["UnsupportedMediaType"] = 415] = "UnsupportedMediaType";
  StatusCode2[StatusCode2["RequestedRangeNotSatisfiable"] = 416] = "RequestedRangeNotSatisfiable";
  StatusCode2[StatusCode2["ExpectationFailed"] = 417] = "ExpectationFailed";
  StatusCode2[StatusCode2["ImATeapot"] = 418] = "ImATeapot";
  StatusCode2[StatusCode2["UnprocessableEntity"] = 422] = "UnprocessableEntity";
  StatusCode2[StatusCode2["TooManyRequests"] = 429] = "TooManyRequests";
  StatusCode2[StatusCode2["InternalServerError"] = 500] = "InternalServerError";
  StatusCode2[StatusCode2["NotImplemented"] = 501] = "NotImplemented";
  StatusCode2[StatusCode2["BadGateway"] = 502] = "BadGateway";
  StatusCode2[StatusCode2["ServiceUnavailable"] = 503] = "ServiceUnavailable";
  StatusCode2[StatusCode2["GatewayTimeout"] = 504] = "GatewayTimeout";
  StatusCode2[StatusCode2["HttpVersionNotSupported"] = 505] = "HttpVersionNotSupported";
})(StatusCode || (StatusCode = {}));
var Header;
(function(Header2) {
  Header2["Accept"] = "Accept";
  Header2["AcceptEncoding"] = "Accept-Encoding";
  Header2["AcceptLanguage"] = "Accept-Language";
  Header2["AccessControlAllowCredentials"] = "Access-Control-Allow-Credentials";
  Header2["AccessControlAllowHeaders"] = "Access-Control-Allow-Headers";
  Header2["AccessControlAllowMethods"] = "Access-Control-Allow-Methods";
  Header2["AccessControlAllowOrigin"] = "Access-Control-Allow-Origin";
  Header2["AccessControlExposeHeaders"] = "Access-Control-Expose-Headers";
  Header2["AccessControlMaxAge"] = "Access-Control-Max-Age";
  Header2["AccessControlRequestHeaders"] = "Access-Control-Request-Headers";
  Header2["AccessControlRequestMethod"] = "Access-Control-Request-Method";
  Header2["Authorization"] = "Authorization";
  Header2["CacheControl"] = "Cache-Control";
  Header2["CacheStatus"] = "Cache-Status";
  Header2["Connection"] = "Connection";
  Header2["ContentDisposition"] = "Content-Disposition";
  Header2["ContentEncoding"] = "Content-Encoding";
  Header2["ContentLength"] = "Content-Length";
  Header2["ContentSecurityPolicy"] = "Content-Security-Policy";
  Header2["ContentSecurityPolicyReportOnly"] = "Content-Security-Policy-Report-Only";
  Header2["ContentType"] = "Content-Type";
  Header2["ContentTypeOptions"] = "X-Content-Type-Options";
  Header2["Cookie"] = "Cookie";
  Header2["DownloadOptions"] = "X-Download-Options";
  Header2["ETag"] = "ETag";
  Header2["Forwarded"] = "Forwarded";
  Header2["ForwardedFor"] = "X-Forwarded-For";
  Header2["ForwardedHost"] = "X-Forwarded-Host";
  Header2["ForwardedProtocol"] = "X-Forwarded-Proto";
  Header2["FrameOptions"] = "X-Frame-Options";
  Header2["Host"] = "Host";
  Header2["IfNoneMatch"] = "If-None-Match";
  Header2["Location"] = "Location";
  Header2["Origin"] = "Origin";
  Header2["ReferrerPolicy"] = "Referrer-Policy";
  Header2["ServerTiming"] = "Server-Timing";
  Header2["StrictTransportSecurity"] = "Strict-Transport-Security";
  Header2["TimingAllowOrigin"] = "Timing-Allow-Origin";
  Header2["Trailer"] = "Trailer";
  Header2["TransferEncoding"] = "Transfer-Encoding";
  Header2["UserAgent"] = "User-Agent";
  Header2["WwwAuthenticate"] = "WWW-Authenticate";
  Header2["XhrRedirectedTo"] = "X-XHR-Redirected-To";
  Header2["XhrReferer"] = "X-XHR-Referer";
  Header2["XssProtecton"] = "X-XSS-Protection";
  Header2["XContentTypeOptions"] = "X-Content-Type-Options";
  Header2["XDownloadOptions"] = "X-Download-Options";
  Header2["XForwardedFor"] = "X-Forwarded-For";
  Header2["XForwardedHost"] = "X-Forwarded-Host";
  Header2["XForwardedProto"] = "X-Forwarded-Proto";
  Header2["XFrameOptions"] = "X-Frame-Options";
  Header2["XXhrRedirectedTo"] = "X-XHR-Redirected-To";
  Header2["XXhrReferer"] = "X-XHR-Referer";
  Header2["XXssProtecton"] = "X-XSS-Protection";
  Header2["XXssProtection"] = "X-XSS-Protection";
})(Header || (Header = {}));
var CspDirective;
(function(CspDirective2) {
  CspDirective2["ChildSrc"] = "child-src";
  CspDirective2["ConnectSrc"] = "connect-src";
  CspDirective2["DefaultSrc"] = "default-src";
  CspDirective2["FontSrc"] = "font-src";
  CspDirective2["FrameSrc"] = "frame-src";
  CspDirective2["ImgSrc"] = "img-src";
  CspDirective2["ManifestSrc"] = "manifest-src";
  CspDirective2["MediaSrc"] = "media-src";
  CspDirective2["ObjectSrc"] = "object-src";
  CspDirective2["PrefetchSrc"] = "prefetch-src";
  CspDirective2["ScriptSrc"] = "script-src";
  CspDirective2["StyleSrc"] = "style-src";
  CspDirective2["WebrtcSrc"] = "webrtc-src";
  CspDirective2["WorkerSrc"] = "worker-src";
  CspDirective2["BaseUri"] = "base-uri";
  CspDirective2["PluginTypes"] = "plugin-types";
  CspDirective2["Sandbox"] = "sandbox";
  CspDirective2["FormAction"] = "form-action";
  CspDirective2["FrameAncestors"] = "frame-ancestors";
  CspDirective2["ReportUri"] = "report-uri";
  CspDirective2["BlockAllMixedContent"] = "block-all-mixed-content";
  CspDirective2["RequireSriFor"] = "require-sri-for";
  CspDirective2["UpgradeInsecureRequests"] = "upgrade-insecure-requests";
})(CspDirective || (CspDirective = {}));
var CspSandboxAllow;
(function(CspSandboxAllow2) {
  CspSandboxAllow2["Forms"] = "allow-forms";
  CspSandboxAllow2["SameOrigin"] = "allow-same-origin";
  CspSandboxAllow2["Scripts"] = "allow-scripts";
  CspSandboxAllow2["Popups"] = "allow-popups";
  CspSandboxAllow2["Modals"] = "allow-modals";
  CspSandboxAllow2["OrientationLock"] = "allow-orientation-lock";
  CspSandboxAllow2["PointerLock"] = "allow-pointer-lock";
  CspSandboxAllow2["Presentation"] = "allow-presentation";
  CspSandboxAllow2["PopupsToEscapeSandbox"] = "allow-popups-to-escape-sandbox";
  CspSandboxAllow2["TopNavigation"] = "allow-top-navigation";
})(CspSandboxAllow || (CspSandboxAllow = {}));
var SpecialSource;
(function(SpecialSource2) {
  SpecialSource2["Any"] = "*";
  SpecialSource2["Self"] = "'self'";
  SpecialSource2["UnsafeInline"] = "'unsafe-inline'";
  SpecialSource2["UnsafeEval"] = "'unsafe-eval'";
  SpecialSource2["None"] = "'none'";
  SpecialSource2["StrictDynamic"] = "'strict-dynamic'";
  SpecialSource2["ReportSample"] = "'report-sample'";
  SpecialSource2["Data"] = "data:";
  SpecialSource2["Blob"] = "blob:";
  SpecialSource2["FileSystem"] = "filesystem:";
})(SpecialSource || (SpecialSource = {}));
var SriAsset;
(function(SriAsset2) {
  SriAsset2["Script"] = "script";
  SriAsset2["Style"] = "style";
})(SriAsset || (SriAsset = {}));
var HashAlgorithm;
(function(HashAlgorithm2) {
  HashAlgorithm2["Sha256"] = "sha256";
  HashAlgorithm2["Sha384"] = "sha384";
  HashAlgorithm2["Sha512"] = "sha512";
})(HashAlgorithm || (HashAlgorithm = {}));
var ResponseType;
(function(ResponseType2) {
  ResponseType2["Informational"] = "1xx";
  ResponseType2["Success"] = "2xx";
  ResponseType2["Redirection"] = "3xx";
  ResponseType2["ClientError"] = "4xx";
  ResponseType2["ServerError"] = "5xx";
  ResponseType2["Unknown"] = "Unknown";
})(ResponseType || (ResponseType = {}));
var CacheControl;
(function(CacheControl2) {
  CacheControl2["NoCache"] = "no-cache";
  CacheControl2["NoStore"] = "no-store";
  CacheControl2["MustRevalidate"] = "must-revalidate";
  CacheControl2["MaxAge"] = "max-age";
})(CacheControl || (CacheControl = {}));
var noCache = `${CacheControl.NoCache},${CacheControl.NoStore},${CacheControl.MustRevalidate},${CacheControl.MaxAge}=0`;

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/lib/clients/common.mjs
function getUserAgent(config) {
  let userAgentPrefix = `${LIBRARY_NAME} v${SHOPIFY_API_LIBRARY_VERSION} | ${abstractRuntimeString()}`;
  if (config.userAgentPrefix) {
    userAgentPrefix = `${config.userAgentPrefix} | ${userAgentPrefix}`;
  }
  return userAgentPrefix;
}
function clientLoggerFactory(config) {
  return (logContent) => {
    if (config.logger.httpRequests) {
      switch (logContent.type) {
        case "HTTP-Response": {
          const responseLog = logContent.content;
          logger(config).debug("Received response for HTTP request", {
            requestParams: JSON.stringify(responseLog.requestParams),
            response: JSON.stringify(responseLog.response)
          });
          break;
        }
        case "HTTP-Retry": {
          const responseLog = logContent.content;
          logger(config).debug("Retrying HTTP request", {
            requestParams: JSON.stringify(responseLog.requestParams),
            retryAttempt: responseLog.retryAttempt,
            maxRetries: responseLog.maxRetries,
            response: JSON.stringify(responseLog.lastResponse)
          });
          break;
        }
        default: {
          logger(config).debug(`HTTP request event: ${logContent.content}`);
          break;
        }
      }
    }
  };
}
function throwFailedRequest(body, atMaxRetries, response) {
  if (typeof response === "undefined") {
    const message = body?.errors?.message ?? "";
    throw new HttpRequestError(`Http request error, no response available: ${message}`);
  }
  const responseHeaders = canonicalizeHeaders(Object.fromEntries(response.headers.entries() ?? []));
  if (response.status === StatusCode.Ok && body.errors.graphQLErrors) {
    throw new GraphqlQueryError({
      message: body.errors.graphQLErrors?.[0].message ?? "GraphQL operation failed",
      response,
      headers: responseHeaders,
      body
    });
  }
  const errorMessages = [];
  if (body.errors) {
    errorMessages.push(JSON.stringify(body.errors, null, 2));
  }
  const xRequestId = getHeader(responseHeaders, "x-request-id");
  if (xRequestId) {
    errorMessages.push(`If you report this error, please include this id: ${xRequestId}`);
  }
  const errorMessage = errorMessages.length ? `:
${errorMessages.join("\n")}` : "";
  const code = response.status;
  const statusText = response.statusText;
  switch (true) {
    case response.status === StatusCode.TooManyRequests: {
      if (atMaxRetries) {
        throw new HttpMaxRetriesError("Attempted the maximum number of retries for HTTP request.");
      } else {
        const retryAfter = getHeader(responseHeaders, "Retry-After");
        throw new HttpThrottlingError({
          message: `Shopify is throttling requests ${errorMessage}`,
          code,
          statusText,
          body,
          headers: responseHeaders,
          retryAfter: retryAfter ? parseFloat(retryAfter) : void 0
        });
      }
    }
    case response.status >= StatusCode.InternalServerError:
      if (atMaxRetries) {
        throw new HttpMaxRetriesError("Attempted the maximum number of retries for HTTP request.");
      } else {
        throw new HttpInternalError({
          message: `Shopify internal error${errorMessage}`,
          code,
          statusText,
          body,
          headers: responseHeaders
        });
      }
    default:
      throw new HttpResponseError({
        message: `Received an error response (${response.status} ${response.statusText}) from Shopify${errorMessage}`,
        code,
        statusText,
        body,
        headers: responseHeaders
      });
  }
}

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/lib/clients/admin/rest/client.mjs
var RestClient = class {
  constructor({ session, apiVersion }) {
    this.loggedDeprecations = {};
    const config = this.restClass().config;
    if (!config.isCustomStoreApp && !session.accessToken) {
      throw new MissingRequiredArgument("Missing access token when creating REST client");
    }
    if (apiVersion) {
      const message = apiVersion === config.apiVersion ? `REST client has a redundant API version override to the default ${apiVersion}` : `REST client overriding default API version ${config.apiVersion} with ${apiVersion}`;
      logger(config).debug(message);
    }
    const customStoreAppAccessToken = config.adminApiAccessToken ?? config.apiSecretKey;
    this.session = session;
    this.apiVersion = apiVersion ?? config.apiVersion;
    this.client = createAdminRestApiClient({
      scheme: config.hostScheme,
      storeDomain: session.shop,
      apiVersion: apiVersion ?? config.apiVersion,
      accessToken: config.isCustomStoreApp ? customStoreAppAccessToken : session.accessToken,
      customFetchApi: abstractFetch,
      logger: clientLoggerFactory(config),
      userAgentPrefix: getUserAgent(config),
      defaultRetryTime: this.restClass().RETRY_WAIT_TIME,
      formatPaths: this.restClass().formatPaths
    });
  }
  /**
   * Performs a GET request on the given path.
   */
  async get(params) {
    return this.request({ method: Method2.Get, ...params });
  }
  /**
   * Performs a POST request on the given path.
   */
  async post(params) {
    return this.request({ method: Method2.Post, ...params });
  }
  /**
   * Performs a PUT request on the given path.
   */
  async put(params) {
    return this.request({ method: Method2.Put, ...params });
  }
  /**
   * Performs a DELETE request on the given path.
   */
  async delete(params) {
    return this.request({ method: Method2.Delete, ...params });
  }
  async request(params) {
    const requestParams = {
      headers: {
        ...params.extraHeaders,
        ...params.type ? { "Content-Type": params.type.toString() } : {}
      },
      retries: params.tries ? params.tries - 1 : void 0,
      searchParams: params.query
    };
    let response;
    switch (params.method) {
      case Method2.Get:
        response = await this.client.get(params.path, requestParams);
        break;
      case Method2.Put:
        response = await this.client.put(params.path, {
          ...requestParams,
          data: params.data
        });
        break;
      case Method2.Post:
        response = await this.client.post(params.path, {
          ...requestParams,
          data: params.data
        });
        break;
      case Method2.Delete:
        response = await this.client.delete(params.path, requestParams);
        break;
      default:
        throw new InvalidRequestError(`Unsupported request method '${params.method}'`);
    }
    const body = await response.json();
    const responseHeaders = canonicalizeHeaders(Object.fromEntries(response.headers.entries()));
    if (!response.ok) {
      throwFailedRequest(body, (params.tries ?? 1) > 1, response);
    }
    const requestReturn = {
      body,
      headers: responseHeaders
    };
    await this.logDeprecations({
      method: params.method,
      url: params.path,
      headers: requestParams.headers,
      body: params.data ? JSON.stringify(params.data) : void 0
    }, requestReturn);
    const link = response.headers.get("Link");
    if (link !== void 0) {
      const pageInfo = {
        limit: params.query?.limit ? params.query?.limit.toString() : RestClient.DEFAULT_LIMIT
      };
      if (link) {
        const links2 = link.split(", ");
        for (const link2 of links2) {
          const parsedLink = link2.match(RestClient.LINK_HEADER_REGEXP);
          if (!parsedLink) {
            continue;
          }
          const linkRel = parsedLink[2];
          const linkUrl = new URL(parsedLink[1]);
          const linkFields = linkUrl.searchParams.get("fields");
          const linkPageToken = linkUrl.searchParams.get("page_info");
          if (!pageInfo.fields && linkFields) {
            pageInfo.fields = linkFields.split(",");
          }
          if (linkPageToken) {
            switch (linkRel) {
              case "previous":
                pageInfo.previousPageUrl = parsedLink[1];
                pageInfo.prevPage = this.buildRequestParams(parsedLink[1]);
                break;
              case "next":
                pageInfo.nextPageUrl = parsedLink[1];
                pageInfo.nextPage = this.buildRequestParams(parsedLink[1]);
                break;
            }
          }
        }
      }
      requestReturn.pageInfo = pageInfo;
    }
    return requestReturn;
  }
  restClass() {
    return this.constructor;
  }
  buildRequestParams(newPageUrl) {
    const pattern = `^/admin/api/[^/]+/(.*).json$`;
    const url = new URL(newPageUrl);
    const path = url.pathname.replace(new RegExp(pattern), "$1");
    return {
      path,
      query: Object.fromEntries(url.searchParams.entries())
    };
  }
  async logDeprecations(request2, response) {
    const config = this.restClass().config;
    const deprecationReason = getHeader(response.headers, "X-Shopify-API-Deprecated-Reason");
    if (deprecationReason) {
      const deprecation = {
        message: deprecationReason,
        path: request2.url
      };
      if (request2.body) {
        deprecation.body = `${request2.body.substring(0, 100)}...`;
      }
      const depHash = await createSHA256HMAC(config.apiSecretKey, JSON.stringify(deprecation), HashFormat.Hex);
      if (!Object.keys(this.loggedDeprecations).includes(depHash) || Date.now() - this.loggedDeprecations[depHash] >= RestClient.DEPRECATION_ALERT_DELAY) {
        this.loggedDeprecations[depHash] = Date.now();
        const stack = new Error().stack;
        const message = `API Deprecation Notice ${(/* @__PURE__ */ new Date()).toLocaleString()} : ${JSON.stringify(deprecation)}  -  Stack Trace: ${stack}`;
        await logger(config).warning(message);
      }
    }
  }
};
RestClient.LINK_HEADER_REGEXP = /<([^<]+)>; rel="([^"]+)"/;
RestClient.DEFAULT_LIMIT = "50";
RestClient.RETRY_WAIT_TIME = 1e3;
RestClient.DEPRECATION_ALERT_DELAY = 3e5;

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/lib/utils/types.mjs
var HmacValidationType;
(function(HmacValidationType2) {
  HmacValidationType2["Flow"] = "flow";
  HmacValidationType2["Webhook"] = "webhook";
  HmacValidationType2["FulfillmentService"] = "fulfillment_service";
})(HmacValidationType || (HmacValidationType = {}));
var ValidationErrorReason = {
  MissingBody: "missing_body",
  InvalidHmac: "invalid_hmac",
  MissingHmac: "missing_hmac"
};

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/lib/clients/types.mjs
var DataType;
(function(DataType2) {
  DataType2["JSON"] = "application/json";
  DataType2["GraphQL"] = "application/graphql";
  DataType2["URLEncoded"] = "application/x-www-form-urlencoded";
})(DataType || (DataType = {}));

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/lib/auth/oauth/token-exchange.mjs
var RequestedTokenType;
(function(RequestedTokenType2) {
  RequestedTokenType2["OnlineAccessToken"] = "urn:shopify:params:oauth:token-type:online-access-token";
  RequestedTokenType2["OfflineAccessToken"] = "urn:shopify:params:oauth:token-type:offline-access-token";
})(RequestedTokenType || (RequestedTokenType = {}));

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/lib/webhooks/types.mjs
var DeliveryMethod;
(function(DeliveryMethod2) {
  DeliveryMethod2["Http"] = "http";
  DeliveryMethod2["EventBridge"] = "eventbridge";
  DeliveryMethod2["PubSub"] = "pubsub";
})(DeliveryMethod || (DeliveryMethod = {}));
var WebhookOperation;
(function(WebhookOperation2) {
  WebhookOperation2["Create"] = "create";
  WebhookOperation2["Update"] = "update";
  WebhookOperation2["Delete"] = "delete";
})(WebhookOperation || (WebhookOperation = {}));
var WebhookValidationErrorReason = {
  ...ValidationErrorReason,
  MissingHeaders: "missing_headers"
};

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/lib/webhooks/validate.mjs
var OPTIONAL_HANDLER_PROPERTIES = {
  subTopic: ShopifyHeader.SubTopic
};
var HANDLER_PROPERTIES = {
  apiVersion: ShopifyHeader.ApiVersion,
  domain: ShopifyHeader.Domain,
  hmac: ShopifyHeader.Hmac,
  topic: ShopifyHeader.Topic,
  webhookId: ShopifyHeader.WebhookId,
  ...OPTIONAL_HANDLER_PROPERTIES
};

// node_modules/@shopify/shopify-app-remix/node_modules/@shopify/shopify-api/dist/esm/lib/webhooks/process.mjs
var STATUS_TEXT_LOOKUP = {
  [StatusCode.Ok]: "OK",
  [StatusCode.BadRequest]: "Bad Request",
  [StatusCode.Unauthorized]: "Unauthorized",
  [StatusCode.NotFound]: "Not Found",
  [StatusCode.InternalServerError]: "Internal Server Error"
};

// node_modules/@shopify/shopify-app-remix/dist/esm/server/types.mjs
var AppDistribution;
(function(AppDistribution2) {
  AppDistribution2["AppStore"] = "app_store";
  AppDistribution2["SingleMerchant"] = "single_merchant";
  AppDistribution2["ShopifyAdmin"] = "shopify_admin";
})(AppDistribution || (AppDistribution = {}));
var LoginErrorType;
(function(LoginErrorType2) {
  LoginErrorType2["MissingShop"] = "MISSING_SHOP";
  LoginErrorType2["InvalidShop"] = "INVALID_SHOP";
})(LoginErrorType || (LoginErrorType = {}));

// node_modules/@shopify/shopify-app-remix/dist/esm/server/boundary/headers.mjs
function headersBoundary(headers) {
  const { parentHeaders, loaderHeaders, actionHeaders, errorHeaders } = headers;
  if (errorHeaders && Array.from(errorHeaders.entries()).length > 0) {
    return errorHeaders;
  }
  return new Headers([
    ...parentHeaders ? Array.from(parentHeaders.entries()) : [],
    ...loaderHeaders ? Array.from(loaderHeaders.entries()) : [],
    ...actionHeaders ? Array.from(actionHeaders.entries()) : []
  ]);
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/boundary/error.mjs
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function errorBoundary(error) {
  if (error.constructor.name === "ErrorResponse" || error.constructor.name === "ErrorResponseImpl") {
    return (0, import_jsx_runtime.jsx)("div", { dangerouslySetInnerHTML: { __html: error.data || "Handling response" } });
  }
  throw error;
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/boundary/index.mjs
var boundary = {
  /**
   * A function that handles errors or thrown responses.
   *
   * @example
   * <caption>Catching errors in a route</caption>
   * ```ts
   * // /app/routes/admin/widgets.ts
   * import { boundary } from "@shopify/shopify-app-remix/server";
   *
   * export function ErrorBoundary() {
   *   return boundary.error(useRouteError());
   * }
   * ```
   */
  error: errorBoundary,
  /**
   * A function that sets the appropriate document response headers.
   *
   * @example
   * <caption>Catching errors in a route</caption>
   * ```ts
   * // /app/routes/admin/widgets.ts
   * import { boundary } from "@shopify/shopify-app-remix/server";
   *
   * export const headers = (headersArgs) => {
   *   return boundary.headers(headersArgs);
   * };
   * ```
   */
  headers: headersBoundary
};

// node_modules/@shopify/shopify-app-remix/dist/esm/server/override-logger.mjs
var import_semver = __toESM(require_semver2(), 1);

// node_modules/@shopify/shopify-app-remix/dist/esm/server/index.mjs
setAbstractRuntimeString(() => {
  return `Remix`;
});

// node_modules/@shopify/shopify-app-remix/dist/esm/react/components/AppProvider/AppProvider.mjs
var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);

// ../node_modules/@shopify/polaris/locales/en.json
var en_default = {
  Polaris: {
    ActionMenu: {
      Actions: {
        moreActions: "More actions"
      },
      RollupActions: {
        rollupButton: "View actions"
      }
    },
    ActionList: {
      SearchField: {
        clearButtonLabel: "Clear",
        search: "Search",
        placeholder: "Search actions"
      }
    },
    Avatar: {
      label: "Avatar",
      labelWithInitials: "Avatar with initials {initials}"
    },
    Autocomplete: {
      spinnerAccessibilityLabel: "Loading",
      ellipsis: "{content}\u2026"
    },
    Badge: {
      PROGRESS_LABELS: {
        incomplete: "Incomplete",
        partiallyComplete: "Partially complete",
        complete: "Complete"
      },
      TONE_LABELS: {
        info: "Info",
        success: "Success",
        warning: "Warning",
        critical: "Critical",
        attention: "Attention",
        new: "New",
        readOnly: "Read-only",
        enabled: "Enabled"
      },
      progressAndTone: "{toneLabel} {progressLabel}"
    },
    Banner: {
      dismissButton: "Dismiss notification"
    },
    Button: {
      spinnerAccessibilityLabel: "Loading"
    },
    Common: {
      checkbox: "checkbox",
      undo: "Undo",
      cancel: "Cancel",
      clear: "Clear",
      close: "Close",
      submit: "Submit",
      more: "More"
    },
    ContextualSaveBar: {
      save: "Save",
      discard: "Discard"
    },
    DataTable: {
      sortAccessibilityLabel: "sort {direction} by",
      navAccessibilityLabel: "Scroll table {direction} one column",
      totalsRowHeading: "Totals",
      totalRowHeading: "Total"
    },
    DatePicker: {
      previousMonth: "Show previous month, {previousMonthName} {showPreviousYear}",
      nextMonth: "Show next month, {nextMonth} {nextYear}",
      today: "Today ",
      start: "Start of range",
      end: "End of range",
      months: {
        january: "January",
        february: "February",
        march: "March",
        april: "April",
        may: "May",
        june: "June",
        july: "July",
        august: "August",
        september: "September",
        october: "October",
        november: "November",
        december: "December"
      },
      days: {
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
        sunday: "Sunday"
      },
      daysAbbreviated: {
        monday: "Mo",
        tuesday: "Tu",
        wednesday: "We",
        thursday: "Th",
        friday: "Fr",
        saturday: "Sa",
        sunday: "Su"
      }
    },
    DiscardConfirmationModal: {
      title: "Discard all unsaved changes",
      message: "If you discard changes, you\u2019ll delete any edits you made since you last saved.",
      primaryAction: "Discard changes",
      secondaryAction: "Continue editing"
    },
    DropZone: {
      single: {
        overlayTextFile: "Drop file to upload",
        overlayTextImage: "Drop image to upload",
        overlayTextVideo: "Drop video to upload",
        actionTitleFile: "Add file",
        actionTitleImage: "Add image",
        actionTitleVideo: "Add video",
        actionHintFile: "or drop file to upload",
        actionHintImage: "or drop image to upload",
        actionHintVideo: "or drop video to upload",
        labelFile: "Upload file",
        labelImage: "Upload image",
        labelVideo: "Upload video"
      },
      allowMultiple: {
        overlayTextFile: "Drop files to upload",
        overlayTextImage: "Drop images to upload",
        overlayTextVideo: "Drop videos to upload",
        actionTitleFile: "Add files",
        actionTitleImage: "Add images",
        actionTitleVideo: "Add videos",
        actionHintFile: "or drop files to upload",
        actionHintImage: "or drop images to upload",
        actionHintVideo: "or drop videos to upload",
        labelFile: "Upload files",
        labelImage: "Upload images",
        labelVideo: "Upload videos"
      },
      errorOverlayTextFile: "File type is not valid",
      errorOverlayTextImage: "Image type is not valid",
      errorOverlayTextVideo: "Video type is not valid"
    },
    EmptySearchResult: {
      altText: "Empty search results"
    },
    Frame: {
      skipToContent: "Skip to content",
      navigationLabel: "Navigation",
      Navigation: {
        closeMobileNavigationLabel: "Close navigation"
      }
    },
    FullscreenBar: {
      back: "Back",
      accessibilityLabel: "Exit fullscreen mode"
    },
    Filters: {
      moreFilters: "More filters",
      moreFiltersWithCount: "More filters ({count})",
      filter: "Filter {resourceName}",
      noFiltersApplied: "No filters applied",
      cancel: "Cancel",
      done: "Done",
      clearAllFilters: "Clear all filters",
      clear: "Clear",
      clearLabel: "Clear {filterName}",
      addFilter: "Add filter",
      clearFilters: "Clear all",
      searchInView: "in:{viewName}"
    },
    FilterPill: {
      clear: "Clear",
      unsavedChanges: "Unsaved changes - {label}"
    },
    IndexFilters: {
      searchFilterTooltip: "Search and filter",
      searchFilterTooltipWithShortcut: "Search and filter (F)",
      searchFilterAccessibilityLabel: "Search and filter results",
      sort: "Sort your results",
      addView: "Add a new view",
      newView: "Custom search",
      SortButton: {
        ariaLabel: "Sort the results",
        tooltip: "Sort",
        title: "Sort by",
        sorting: {
          asc: "Ascending",
          desc: "Descending",
          az: "A-Z",
          za: "Z-A"
        }
      },
      EditColumnsButton: {
        tooltip: "Edit columns",
        accessibilityLabel: "Customize table column order and visibility"
      },
      UpdateButtons: {
        cancel: "Cancel",
        update: "Update",
        save: "Save",
        saveAs: "Save as",
        modal: {
          title: "Save view as",
          label: "Name",
          sameName: "A view with this name already exists. Please choose a different name.",
          save: "Save",
          cancel: "Cancel"
        }
      }
    },
    IndexProvider: {
      defaultItemSingular: "Item",
      defaultItemPlural: "Items",
      allItemsSelected: "All {itemsLength}+ {resourceNamePlural} are selected",
      selected: "{selectedItemsCount} selected",
      a11yCheckboxDeselectAllSingle: "Deselect {resourceNameSingular}",
      a11yCheckboxSelectAllSingle: "Select {resourceNameSingular}",
      a11yCheckboxDeselectAllMultiple: "Deselect all {itemsLength} {resourceNamePlural}",
      a11yCheckboxSelectAllMultiple: "Select all {itemsLength} {resourceNamePlural}"
    },
    IndexTable: {
      emptySearchTitle: "No {resourceNamePlural} found",
      emptySearchDescription: "Try changing the filters or search term",
      onboardingBadgeText: "New",
      resourceLoadingAccessibilityLabel: "Loading {resourceNamePlural}\u2026",
      selectAllLabel: "Select all {resourceNamePlural}",
      selected: "{selectedItemsCount} selected",
      undo: "Undo",
      selectAllItems: "Select all {itemsLength}+ {resourceNamePlural}",
      selectItem: "Select {resourceName}",
      selectButtonText: "Select",
      sortAccessibilityLabel: "sort {direction} by"
    },
    Loading: {
      label: "Page loading bar"
    },
    Modal: {
      iFrameTitle: "body markup",
      modalWarning: "These required properties are missing from Modal: {missingProps}"
    },
    Page: {
      Header: {
        rollupActionsLabel: "View actions for {title}",
        pageReadyAccessibilityLabel: "{title}. This page is ready"
      }
    },
    Pagination: {
      previous: "Previous",
      next: "Next",
      pagination: "Pagination"
    },
    ProgressBar: {
      negativeWarningMessage: "Values passed to the progress prop shouldn\u2019t be negative. Resetting {progress} to 0.",
      exceedWarningMessage: "Values passed to the progress prop shouldn\u2019t exceed 100. Setting {progress} to 100."
    },
    ResourceList: {
      sortingLabel: "Sort by",
      defaultItemSingular: "item",
      defaultItemPlural: "items",
      showing: "Showing {itemsCount} {resource}",
      showingTotalCount: "Showing {itemsCount} of {totalItemsCount} {resource}",
      loading: "Loading {resource}",
      selected: "{selectedItemsCount} selected",
      allItemsSelected: "All {itemsLength}+ {resourceNamePlural} in your store are selected",
      allFilteredItemsSelected: "All {itemsLength}+ {resourceNamePlural} in this filter are selected",
      selectAllItems: "Select all {itemsLength}+ {resourceNamePlural} in your store",
      selectAllFilteredItems: "Select all {itemsLength}+ {resourceNamePlural} in this filter",
      emptySearchResultTitle: "No {resourceNamePlural} found",
      emptySearchResultDescription: "Try changing the filters or search term",
      selectButtonText: "Select",
      a11yCheckboxDeselectAllSingle: "Deselect {resourceNameSingular}",
      a11yCheckboxSelectAllSingle: "Select {resourceNameSingular}",
      a11yCheckboxDeselectAllMultiple: "Deselect all {itemsLength} {resourceNamePlural}",
      a11yCheckboxSelectAllMultiple: "Select all {itemsLength} {resourceNamePlural}",
      Item: {
        actionsDropdownLabel: "Actions for {accessibilityLabel}",
        actionsDropdown: "Actions dropdown",
        viewItem: "View details for {itemName}"
      },
      BulkActions: {
        actionsActivatorLabel: "Actions",
        moreActionsActivatorLabel: "More actions"
      }
    },
    SkeletonPage: {
      loadingLabel: "Page loading"
    },
    Tabs: {
      newViewAccessibilityLabel: "Create new view",
      newViewTooltip: "Create view",
      toggleTabsLabel: "More views",
      Tab: {
        rename: "Rename view",
        duplicate: "Duplicate view",
        edit: "Edit view",
        editColumns: "Edit columns",
        delete: "Delete view",
        copy: "Copy of {name}",
        deleteModal: {
          title: "Delete view?",
          description: "This can\u2019t be undone. {viewName} view will no longer be available in your admin.",
          cancel: "Cancel",
          delete: "Delete view"
        }
      },
      RenameModal: {
        title: "Rename view",
        label: "Name",
        cancel: "Cancel",
        create: "Save",
        errors: {
          sameName: "A view with this name already exists. Please choose a different name."
        }
      },
      DuplicateModal: {
        title: "Duplicate view",
        label: "Name",
        cancel: "Cancel",
        create: "Create view",
        errors: {
          sameName: "A view with this name already exists. Please choose a different name."
        }
      },
      CreateViewModal: {
        title: "Create new view",
        label: "Name",
        cancel: "Cancel",
        create: "Create view",
        errors: {
          sameName: "A view with this name already exists. Please choose a different name."
        }
      }
    },
    Tag: {
      ariaLabel: "Remove {children}"
    },
    TextField: {
      characterCount: "{count} characters",
      characterCountWithMaxLength: "{count} of {limit} characters used"
    },
    TooltipOverlay: {
      accessibilityLabel: "Tooltip: {label}"
    },
    TopBar: {
      toggleMenuLabel: "Toggle menu",
      SearchField: {
        clearButtonLabel: "Clear",
        search: "Search"
      }
    },
    MediaCard: {
      dismissButton: "Dismiss",
      popoverButton: "Actions"
    },
    VideoThumbnail: {
      playButtonA11yLabel: {
        default: "Play video",
        defaultWithDuration: "Play video of length {duration}",
        duration: {
          hours: {
            other: {
              only: "{hourCount} hours",
              andMinutes: "{hourCount} hours and {minuteCount} minutes",
              andMinute: "{hourCount} hours and {minuteCount} minute",
              minutesAndSeconds: "{hourCount} hours, {minuteCount} minutes, and {secondCount} seconds",
              minutesAndSecond: "{hourCount} hours, {minuteCount} minutes, and {secondCount} second",
              minuteAndSeconds: "{hourCount} hours, {minuteCount} minute, and {secondCount} seconds",
              minuteAndSecond: "{hourCount} hours, {minuteCount} minute, and {secondCount} second",
              andSeconds: "{hourCount} hours and {secondCount} seconds",
              andSecond: "{hourCount} hours and {secondCount} second"
            },
            one: {
              only: "{hourCount} hour",
              andMinutes: "{hourCount} hour and {minuteCount} minutes",
              andMinute: "{hourCount} hour and {minuteCount} minute",
              minutesAndSeconds: "{hourCount} hour, {minuteCount} minutes, and {secondCount} seconds",
              minutesAndSecond: "{hourCount} hour, {minuteCount} minutes, and {secondCount} second",
              minuteAndSeconds: "{hourCount} hour, {minuteCount} minute, and {secondCount} seconds",
              minuteAndSecond: "{hourCount} hour, {minuteCount} minute, and {secondCount} second",
              andSeconds: "{hourCount} hour and {secondCount} seconds",
              andSecond: "{hourCount} hour and {secondCount} second"
            }
          },
          minutes: {
            other: {
              only: "{minuteCount} minutes",
              andSeconds: "{minuteCount} minutes and {secondCount} seconds",
              andSecond: "{minuteCount} minutes and {secondCount} second"
            },
            one: {
              only: "{minuteCount} minute",
              andSeconds: "{minuteCount} minute and {secondCount} seconds",
              andSecond: "{minuteCount} minute and {secondCount} second"
            }
          },
          seconds: {
            other: "{secondCount} seconds",
            one: "{secondCount} second"
          }
        }
      }
    }
  }
};

// node_modules/@shopify/shopify-app-remix/dist/esm/react/const.mjs
var APP_BRIDGE_URL2 = "https://cdn.shopify.com/shopifycloud/app-bridge.js";

// node_modules/@shopify/shopify-app-remix/dist/esm/react/components/RemixPolarisLink.mjs
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var import_react = __toESM(require_react(), 1);
var RemixPolarisLink = import_react.default.forwardRef((props, ref) => (0, import_jsx_runtime2.jsx)(Link, { ...props, to: props.url ?? props.to, ref }));

// node_modules/@shopify/shopify-app-remix/dist/esm/react/components/AppProvider/AppProvider.mjs
function AppProvider2(props) {
  const { children, apiKey, i18n, isEmbeddedApp = true, __APP_BRIDGE_URL = APP_BRIDGE_URL2, ...polarisProps } = props;
  return (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [isEmbeddedApp && (0, import_jsx_runtime3.jsx)("script", { src: __APP_BRIDGE_URL, "data-api-key": apiKey }), (0, import_jsx_runtime3.jsx)(AppProvider, { ...polarisProps, linkComponent: RemixPolarisLink, i18n: i18n || en_default, children })] });
}

// node_modules/@shopify/shopify-app-remix/dist/esm/react/components/AppProxyProvider/AppProxyProvider.mjs
var import_jsx_runtime4 = __toESM(require_jsx_runtime(), 1);
var import_react3 = __toESM(require_react(), 1);
var AppProxyProviderContext = (0, import_react3.createContext)(null);

// node_modules/@shopify/shopify-app-remix/dist/esm/react/components/AppProxyForm/AppProxyForm.mjs
var import_jsx_runtime5 = __toESM(require_jsx_runtime(), 1);
var import_react4 = __toESM(require_react(), 1);

// node_modules/@shopify/shopify-app-remix/dist/esm/react/components/AppProxyLink/AppProxyLink.mjs
var import_jsx_runtime6 = __toESM(require_jsx_runtime(), 1);
var import_react5 = __toESM(require_react(), 1);

// ../node_modules/@shopify/polaris/build/esm/styles.css
var styles_default = "/assets/_assets/styles-M6EFPFNU.css";

// app/routes/app.tsx
var import_shopify = __toESM(require_shopify());

// app/components/ErrorBoundary.tsx
var import_react6 = __toESM(require_react());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/ErrorBoundary.tsx"
  );
  import.meta.hot.lastModified = "1758233065510.3484";
}
var ErrorBoundary = class extends import_react6.default.Component {
  constructor(props) {
    super(props);
    this.reset = () => {
      this.setState({ hasError: false, error: void 0 });
    };
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FallbackComponent, { error: this.state.error, reset: this.reset }, void 0, false, {
          fileName: "app/components/ErrorBoundary.tsx",
          lineNumber: 46,
          columnNumber: 16
        }, this);
      }
      return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(
        "div",
        {
          style: {
            padding: "2rem",
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: "8px",
            margin: "1rem"
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { children: "Application Error" }, void 0, false, {
              fileName: "app/components/ErrorBoundary.tsx",
              lineNumber: 59,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "We're sorry, but something went wrong while loading this page. Please try refreshing the page or contact support if the problem persists." }, void 0, false, {
              fileName: "app/components/ErrorBoundary.tsx",
              lineNumber: 60,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("details", { style: { marginTop: "1rem" }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("summary", { children: "Error Details" }, void 0, false, {
                fileName: "app/components/ErrorBoundary.tsx",
                lineNumber: 62,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("pre", { style: { fontSize: "12px", overflow: "auto" }, children: this.state.error?.message || "Unknown error" }, void 0, false, {
                fileName: "app/components/ErrorBoundary.tsx",
                lineNumber: 63,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/ErrorBoundary.tsx",
              lineNumber: 61,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(
              "button",
              {
                onClick: this.reset,
                style: {
                  marginTop: "1rem",
                  padding: "8px 16px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                },
                children: "Try Again"
              },
              void 0,
              false,
              {
                fileName: "app/components/ErrorBoundary.tsx",
                lineNumber: 67,
                columnNumber: 11
              },
              this
            ),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(
              "button",
              {
                onClick: () => window.location.href = "/app",
                style: {
                  marginTop: "1rem",
                  marginLeft: "8px",
                  padding: "8px 16px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                },
                children: "Go to Dashboard"
              },
              void 0,
              false,
              {
                fileName: "app/components/ErrorBoundary.tsx",
                lineNumber: 81,
                columnNumber: 11
              },
              this
            )
          ]
        },
        void 0,
        true,
        {
          fileName: "app/components/ErrorBoundary.tsx",
          lineNumber: 50,
          columnNumber: 9
        },
        this
      );
    }
    return this.props.children;
  }
};

// app/routes/app.tsx
var import_jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.tsx"
  );
}
var links = () => [{
  rel: "stylesheet",
  href: styles_default
}];
function App() {
  _s();
  const {
    apiKey,
    shopName
  } = useLoaderData();
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(AppProvider2, { isEmbeddedApp: true, apiKey, children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(ErrorBoundary, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
    minHeight: "100vh",
    backgroundColor: "#f6f6f7",
    padding: "0"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { id: "__shop", "data-shop-name": shopName, style: {
      display: "none"
    } }, void 0, false, {
      fileName: "app/routes/app.tsx",
      lineNumber: 84,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Outlet, {}, void 0, false, {
      fileName: "app/routes/app.tsx",
      lineNumber: 88,
      columnNumber: 11
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.tsx",
    lineNumber: 77,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "app/routes/app.tsx",
    lineNumber: 76,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/routes/app.tsx",
    lineNumber: 75,
    columnNumber: 10
  }, this);
}
_s(App, "XM9QwyjgKMvz/kbJdEAuBCgM+Sw=", false, function() {
  return [useLoaderData];
});
_c = App;
var ErrorBoundary2 = boundary.error;
var _c;
$RefreshReg$(_c, "App");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  ErrorBoundary2 as ErrorBoundary,
  App as default,
  links
};
//# sourceMappingURL=/assets/routes/app-AQVAUIKV.js.map
