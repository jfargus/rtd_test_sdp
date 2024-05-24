/*!
  Highlight.js v11.8.0 (git: bb3a6eeb6b)
  (c) 2006-2023 undefined and other contributors
  License: BSD-3-Clause
 */
  var hljs = (function () {
    'use strict';
  
    /* eslint-disable no-multi-assign */
  
    function deepFreeze(obj) {
      if (obj instanceof Map) {
        obj.clear =
          obj.delete =
          obj.set =
            function () {
              throw new Error('map is read-only');
            };
      } else if (obj instanceof Set) {
        obj.add =
          obj.clear =
          obj.delete =
            function () {
              throw new Error('set is read-only');
            };
      }
  
      // Freeze self
      Object.freeze(obj);
  
      Object.getOwnPropertyNames(obj).forEach((name) => {
        const prop = obj[name];
        const type = typeof prop;
  
        // Freeze prop if it is an object or function and also not already frozen
        if ((type === 'object' || type === 'function') && !Object.isFrozen(prop)) {
          deepFreeze(prop);
        }
      });
  
      return obj;
    }
  
    /** @typedef {import('highlight.js').CallbackResponse} CallbackResponse */
    /** @typedef {import('highlight.js').CompiledMode} CompiledMode */
    /** @implements CallbackResponse */
  
    class Response {
      /**
       * @param {CompiledMode} mode
       */
      constructor(mode) {
        // eslint-disable-next-line no-undefined
        if (mode.data === undefined) mode.data = {};
  
        this.data = mode.data;
        this.isMatchIgnored = false;
      }
  
      ignoreMatch() {
        this.isMatchIgnored = true;
      }
    }
  
    /**
     * @param {string} value
     * @returns {string}
     */
    function escapeHTML(value) {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }
  
    /**
     * performs a shallow merge of multiple objects into one
     *
     * @template T
     * @param {T} original
     * @param {Record<string,any>[]} objects
     * @returns {T} a single new object
     */
    function inherit$1(original, ...objects) {
      /** @type Record<string,any> */
      const result = Object.create(null);
  
      for (const key in original) {
        result[key] = original[key];
      }
      objects.forEach(function(obj) {
        for (const key in obj) {
          result[key] = obj[key];
        }
      });
      return /** @type {T} */ (result);
    }
  
    /**
     * @typedef {object} Renderer
     * @property {(text: string) => void} addText
     * @property {(node: Node) => void} openNode
     * @property {(node: Node) => void} closeNode
     * @property {() => string} value
     */
  
    /** @typedef {{scope?: string, language?: string, sublanguage?: boolean}} Node */
    /** @typedef {{walk: (r: Renderer) => void}} Tree */
    /** */
  
    const SPAN_CLOSE = '</span>';
  
    /**
     * Determines if a node needs to be wrapped in <span>
     *
     * @param {Node} node */
    const emitsWrappingTags = (node) => {
      // rarely we can have a sublanguage where language is undefined
      // TODO: track down why
      return !!node.scope;
    };
  
    /**
     *
     * @param {string} name
     * @param {{prefix:string}} options
     */
    const scopeToCSSClass = (name, { prefix }) => {
      // sub-language
      if (name.startsWith("language:")) {
        return name.replace("language:", "language-");
      }
      // tiered scope: comment.line
      if (name.includes(".")) {
        const pieces = name.split(".");
        return [
          `${prefix}${pieces.shift()}`,
          ...(pieces.map((x, i) => `${x}${"_".repeat(i + 1)}`))
        ].join(" ");
      }
      // simple scope
      return `${prefix}${name}`;
    };
  
    /** @type {Renderer} */
    class HTMLRenderer {
      /**
       * Creates a new HTMLRenderer
       *
       * @param {Tree} parseTree - the parse tree (must support `walk` API)
       * @param {{classPrefix: string}} options
       */
      constructor(parseTree, options) {
        this.buffer = "";
        this.classPrefix = options.classPrefix;
        parseTree.walk(this);
      }
  
      /**
       * Adds texts to the output stream
       *
       * @param {string} text */
      addText(text) {
        this.buffer += escapeHTML(text);
      }
  
      /**
       * Adds a node open to the output stream (if needed)
       *
       * @param {Node} node */
      openNode(node) {
        if (!emitsWrappingTags(node)) return;
  
        const className = scopeToCSSClass(node.scope,
          { prefix: this.classPrefix });
        this.span(className);
      }
  
      /**
       * Adds a node close to the output stream (if needed)
       *
       * @param {Node} node */
      closeNode(node) {
        if (!emitsWrappingTags(node)) return;
  
        this.buffer += SPAN_CLOSE;
      }
  
      /**
       * returns the accumulated buffer
      */
      value() {
        return this.buffer;
      }
  
      // helpers
  
      /**
       * Builds a span element
       *
       * @param {string} className */
      span(className) {
        this.buffer += `<span class="${className}">`;
      }
    }
  
    /** @typedef {{scope?: string, language?: string, sublanguage?: boolean, children: Node[]} | string} Node */
    /** @typedef {{scope?: string, language?: string, sublanguage?: boolean, children: Node[]} } DataNode */
    /** @typedef {import('highlight.js').Emitter} Emitter */
    /**  */
  
    /** @returns {DataNode} */
    const newNode = (opts = {}) => {
      /** @type DataNode */
      const result = { children: [] };
      Object.assign(result, opts);
      return result;
    };
  
    class TokenTree {
      constructor() {
        /** @type DataNode */
        this.rootNode = newNode();
        this.stack = [this.rootNode];
      }
  
      get top() {
        return this.stack[this.stack.length - 1];
      }
  
      get root() { return this.rootNode; }
  
      /** @param {Node} node */
      add(node) {
        this.top.children.push(node);
      }
  
      /** @param {string} scope */
      openNode(scope) {
        /** @type Node */
        const node = newNode({ scope });
        this.add(node);
        this.stack.push(node);
      }
  
      closeNode() {
        if (this.stack.length > 1) {
          return this.stack.pop();
        }
        // eslint-disable-next-line no-undefined
        return undefined;
      }
  
      closeAllNodes() {
        while (this.closeNode());
      }
  
      toJSON() {
        return JSON.stringify(this.rootNode, null, 4);
      }
  
      /**
       * @typedef { import("./html_renderer").Renderer } Renderer
       * @param {Renderer} builder
       */
      walk(builder) {
        // this does not
        return this.constructor._walk(builder, this.rootNode);
        // this works
        // return TokenTree._walk(builder, this.rootNode);
      }
  
      /**
       * @param {Renderer} builder
       * @param {Node} node
       */
      static _walk(builder, node) {
        if (typeof node === "string") {
          builder.addText(node);
        } else if (node.children) {
          builder.openNode(node);
          node.children.forEach((child) => this._walk(builder, child));
          builder.closeNode(node);
        }
        return builder;
      }
  
      /**
       * @param {Node} node
       */
      static _collapse(node) {
        if (typeof node === "string") return;
        if (!node.children) return;
  
        if (node.children.every(el => typeof el === "string")) {
          // node.text = node.children.join("");
          // delete node.children;
          node.children = [node.children.join("")];
        } else {
          node.children.forEach((child) => {
            TokenTree._collapse(child);
          });
        }
      }
    }
  
    /**
      Currently this is all private API, but this is the minimal API necessary
      that an Emitter must implement to fully support the parser.
  
      Minimal interface:
  
      - addText(text)
      - __addSublanguage(emitter, subLanguageName)
      - startScope(scope)
      - endScope()
      - finalize()
      - toHTML()
  
    */
  
    /**
     * @implements {Emitter}
     */
    class TokenTreeEmitter extends TokenTree {
      /**
       * @param {*} options
       */
      constructor(options) {
        super();
        this.options = options;
      }
  
      /**
       * @param {string} text
       */
      addText(text) {
        if (text === "") { return; }
  
        this.add(text);
      }
  
      /** @param {string} scope */
      startScope(scope) {
        this.openNode(scope);
      }
  
      endScope() {
        this.closeNode();
      }
  
      /**
       * @param {Emitter & {root: DataNode}} emitter
       * @param {string} name
       */
      __addSublanguage(emitter, name) {
        /** @type DataNode */
        const node = emitter.root;
        if (name) node.scope = `language:${name}`;
  
        this.add(node);
      }
  
      toHTML() {
        const renderer = new HTMLRenderer(this, this.options);
        return renderer.value();
      }
  
      finalize() {
        this.closeAllNodes();
        return true;
      }
    }
  
    /**
     * @param {string} value
     * @returns {RegExp}
     * */
  
    /**
     * @param {RegExp | string } re
     * @returns {string}
     */
    function source(re) {
      if (!re) return null;
      if (typeof re === "string") return re;
  
      return re.source;
    }
  
    /**
     * @param {RegExp | string } re
     * @returns {string}
     */
    function lookahead(re) {
      return concat('(?=', re, ')');
    }
  
    /**
     * @param {RegExp | string } re
     * @returns {string}
     */
    function anyNumberOfTimes(re) {
      return concat('(?:', re, ')*');
    }
  
    /**
     * @param {RegExp | string } re
     * @returns {string}
     */
    function optional(re) {
      return concat('(?:', re, ')?');
    }
  
    /**
     * @param {...(RegExp | string) } args
     * @returns {string}
     */
    function concat(...args) {
      const joined = args.map((x) => source(x)).join("");
      return joined;
    }
  
    /**
     * @param { Array<string | RegExp | Object> } args
     * @returns {object}
     */
    function stripOptionsFromArgs(args) {
      const opts = args[args.length - 1];
  
      if (typeof opts === 'object' && opts.constructor === Object) {
        args.splice(args.length - 1, 1);
        return opts;
      } else {
        return {};
      }
    }
  
    /** @typedef { {capture?: boolean} } RegexEitherOptions */
  
    /**
     * Any of the passed expresssions may match
     *
     * Creates a huge this | this | that | that match
     * @param {(RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]} args
     * @returns {string}
     */
    function either(...args) {
      /** @type { object & {capture?: boolean} }  */
      const opts = stripOptionsFromArgs(args);
      const joined = '('
        + (opts.capture ? "" : "?:")
        + args.map((x) => source(x)).join("|") + ")";
      return joined;
    }
  
    /**
     * @param {RegExp | string} re
     * @returns {number}
     */
    function countMatchGroups(re) {
      return (new RegExp(re.toString() + '|')).exec('').length - 1;
    }
  
    /**
     * Does lexeme start with a regular expression match at the beginning
     * @param {RegExp} re
     * @param {string} lexeme
     */
    function startsWith(re, lexeme) {
      const match = re && re.exec(lexeme);
      return match && match.index === 0;
    }
  
    // BACKREF_RE matches an open parenthesis or backreference. To avoid
    // an incorrect parse, it additionally matches the following:
    // - [...] elements, where the meaning of parentheses and escapes change
    // - other escape sequences, so we do not misparse escape sequences as
    //   interesting elements
    // - non-matching or lookahead parentheses, which do not capture. These
    //   follow the '(' with a '?'.
    const BACKREF_RE = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;
  
    // **INTERNAL** Not intended for outside usage
    // join logically computes regexps.join(separator), but fixes the
    // backreferences so they continue to match.
    // it also places each individual regular expression into it's own
    // match group, keeping track of the sequencing of those match groups
    // is currently an exercise for the caller. :-)
    /**
     * @param {(string | RegExp)[]} regexps
     * @param {{joinWith: string}} opts
     * @returns {string}
     */
    function _rewriteBackreferences(regexps, { joinWith }) {
      let numCaptures = 0;
  
      return regexps.map((regex) => {
        numCaptures += 1;
        const offset = numCaptures;
        let re = source(regex);
        let out = '';
  
        while (re.length > 0) {
          const match = BACKREF_RE.exec(re);
          if (!match) {
            out += re;
            break;
          }
          out += re.substring(0, match.index);
          re = re.substring(match.index + match[0].length);
          if (match[0][0] === '\\' && match[1]) {
            // Adjust the backreference.
            out += '\\' + String(Number(match[1]) + offset);
          } else {
            out += match[0];
            if (match[0] === '(') {
              numCaptures++;
            }
          }
        }
        return out;
      }).map(re => `(${re})`).join(joinWith);
    }
  
    /** @typedef {import('highlight.js').Mode} Mode */
    /** @typedef {import('highlight.js').ModeCallback} ModeCallback */
  
    // Common regexps
    const MATCH_NOTHING_RE = /\b\B/;
    const IDENT_RE$1 = '[a-zA-Z]\\w*';
    const UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
    const NUMBER_RE = '\\b\\d+(\\.\\d+)?';
    const C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
    const BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
    const RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';
  
    /**
    * @param { Partial<Mode> & {binary?: string | RegExp} } opts
    */
    const SHEBANG = (opts = {}) => {
      const beginShebang = /^#![ ]*\//;
      if (opts.binary) {
        opts.begin = concat(
          beginShebang,
          /.*\b/,
          opts.binary,
          /\b.*/);
      }
      return inherit$1({
        scope: 'meta',
        begin: beginShebang,
        end: /$/,
        relevance: 0,
        /** @type {ModeCallback} */
        "on:begin": (m, resp) => {
          if (m.index !== 0) resp.ignoreMatch();
        }
      }, opts);
    };
  
    // Common modes
    const BACKSLASH_ESCAPE = {
      begin: '\\\\[\\s\\S]', relevance: 0
    };
    const APOS_STRING_MODE = {
      scope: 'string',
      begin: '\'',
      end: '\'',
      illegal: '\\n',
      contains: [BACKSLASH_ESCAPE]
    };
    const QUOTE_STRING_MODE = {
      scope: 'string',
      begin: '"',
      end: '"',
      illegal: '\\n',
      contains: [BACKSLASH_ESCAPE]
    };
    const PHRASAL_WORDS_MODE = {
      begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
    };
    /**
     * Creates a comment mode
     *
     * @param {string | RegExp} begin
     * @param {string | RegExp} end
     * @param {Mode | {}} [modeOptions]
     * @returns {Partial<Mode>}
     */
    const COMMENT = function(begin, end, modeOptions = {}) {
      const mode = inherit$1(
        {
          scope: 'comment',
          begin,
          end,
          contains: []
        },
        modeOptions
      );
      mode.contains.push({
        scope: 'doctag',
        // hack to avoid the space from being included. the space is necessary to
        // match here to prevent the plain text rule below from gobbling up doctags
        begin: '[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)',
        end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
        excludeBegin: true,
        relevance: 0
      });
      const ENGLISH_WORD = either(
        // list of common 1 and 2 letter words in English
        "I",
        "a",
        "is",
        "so",
        "us",
        "to",
        "at",
        "if",
        "in",
        "it",
        "on",
        // note: this is not an exhaustive list of contractions, just popular ones
        /[A-Za-z]+['](d|ve|re|ll|t|s|n)/, // contractions - can't we'd they're let's, etc
        /[A-Za-z]+[-][a-z]+/, // `no-way`, etc.
        /[A-Za-z][a-z]{2,}/ // allow capitalized words at beginning of sentences
      );
      // looking like plain text, more likely to be a comment
      mode.contains.push(
        {
          // TODO: how to include ", (, ) without breaking grammars that use these for
          // comment delimiters?
          // begin: /[ ]+([()"]?([A-Za-z'-]{3,}|is|a|I|so|us|[tT][oO]|at|if|in|it|on)[.]?[()":]?([.][ ]|[ ]|\))){3}/
          // ---
  
          // this tries to find sequences of 3 english words in a row (without any
          // "programming" type syntax) this gives us a strong signal that we've
          // TRULY found a comment - vs perhaps scanning with the wrong language.
          // It's possible to find something that LOOKS like the start of the
          // comment - but then if there is no readable text - good chance it is a
          // false match and not a comment.
          //
          // for a visual example please see:
          // https://github.com/highlightjs/highlight.js/issues/2827
  
          begin: concat(
            /[ ]+/, // necessary to prevent us gobbling up doctags like /* @author Bob Mcgill */
            '(',
            ENGLISH_WORD,
            /[.]?[:]?([.][ ]|[ ])/,
            '){3}') // look for 3 words in a row
        }
      );
      return mode;
    };
    const C_LINE_COMMENT_MODE = COMMENT('//', '$');
    const C_BLOCK_COMMENT_MODE = COMMENT('/\\*', '\\*/');
    const HASH_COMMENT_MODE = COMMENT('#', '$');
    const NUMBER_MODE = {
      scope: 'number',
      begin: NUMBER_RE,
      relevance: 0
    };
    const C_NUMBER_MODE = {
      scope: 'number',
      begin: C_NUMBER_RE,
      relevance: 0
    };
    const BINARY_NUMBER_MODE = {
      scope: 'number',
      begin: BINARY_NUMBER_RE,
      relevance: 0
    };
    const REGEXP_MODE = {
      // this outer rule makes sure we actually have a WHOLE regex and not simply
      // an expression such as:
      //
      //     3 / something
      //
      // (which will then blow up when regex's `illegal` sees the newline)
      begin: /(?=\/[^/\n]*\/)/,
      contains: [{
        scope: 'regexp',
        begin: /\//,
        end: /\/[gimuy]*/,
        illegal: /\n/,
        contains: [
          BACKSLASH_ESCAPE,
          {
            begin: /\[/,
            end: /\]/,
            relevance: 0,
            contains: [BACKSLASH_ESCAPE]
          }
        ]
      }]
    };
    const TITLE_MODE = {
      scope: 'title',
      begin: IDENT_RE$1,
      relevance: 0
    };
    const UNDERSCORE_TITLE_MODE = {
      scope: 'title',
      begin: UNDERSCORE_IDENT_RE,
      relevance: 0
    };
    const METHOD_GUARD = {
      // excludes method names from keyword processing
      begin: '\\.\\s*' + UNDERSCORE_IDENT_RE,
      relevance: 0
    };
  
    /**
     * Adds end same as begin mechanics to a mode
     *
     * Your mode must include at least a single () match group as that first match
     * group is what is used for comparison
     * @param {Partial<Mode>} mode
     */
    const END_SAME_AS_BEGIN = function(mode) {
      return Object.assign(mode,
        {
          /** @type {ModeCallback} */
          'on:begin': (m, resp) => { resp.data._beginMatch = m[1]; },
          /** @type {ModeCallback} */
          'on:end': (m, resp) => { if (resp.data._beginMatch !== m[1]) resp.ignoreMatch(); }
        });
    };
  
    var MODES$1 = /*#__PURE__*/Object.freeze({
      __proto__: null,
      MATCH_NOTHING_RE: MATCH_NOTHING_RE,
      IDENT_RE: IDENT_RE$1,
      UNDERSCORE_IDENT_RE: UNDERSCORE_IDENT_RE,
      NUMBER_RE: NUMBER_RE,
      C_NUMBER_RE: C_NUMBER_RE,
      BINARY_NUMBER_RE: BINARY_NUMBER_RE,
      RE_STARTERS_RE: RE_STARTERS_RE,
      SHEBANG: SHEBANG,
      BACKSLASH_ESCAPE: BACKSLASH_ESCAPE,
      APOS_STRING_MODE: APOS_STRING_MODE,
      QUOTE_STRING_MODE: QUOTE_STRING_MODE,
      PHRASAL_WORDS_MODE: PHRASAL_WORDS_MODE,
      COMMENT: COMMENT,
      C_LINE_COMMENT_MODE: C_LINE_COMMENT_MODE,
      C_BLOCK_COMMENT_MODE: C_BLOCK_COMMENT_MODE,
      HASH_COMMENT_MODE: HASH_COMMENT_MODE,
      NUMBER_MODE: NUMBER_MODE,
      C_NUMBER_MODE: C_NUMBER_MODE,
      BINARY_NUMBER_MODE: BINARY_NUMBER_MODE,
      REGEXP_MODE: REGEXP_MODE,
      TITLE_MODE: TITLE_MODE,
      UNDERSCORE_TITLE_MODE: UNDERSCORE_TITLE_MODE,
      METHOD_GUARD: METHOD_GUARD,
      END_SAME_AS_BEGIN: END_SAME_AS_BEGIN
    });
  
    /**
    @typedef {import('highlight.js').CallbackResponse} CallbackResponse
    @typedef {import('highlight.js').CompilerExt} CompilerExt
    */
  
    // Grammar extensions / plugins
    // See: https://github.com/highlightjs/highlight.js/issues/2833
  
    // Grammar extensions allow "syntactic sugar" to be added to the grammar modes
    // without requiring any underlying changes to the compiler internals.
  
    // `compileMatch` being the perfect small example of now allowing a grammar
    // author to write `match` when they desire to match a single expression rather
    // than being forced to use `begin`.  The extension then just moves `match` into
    // `begin` when it runs.  Ie, no features have been added, but we've just made
    // the experience of writing (and reading grammars) a little bit nicer.
  
    // ------
  
    // TODO: We need negative look-behind support to do this properly
    /**
     * Skip a match if it has a preceding dot
     *
     * This is used for `beginKeywords` to prevent matching expressions such as
     * `bob.keyword.do()`. The mode compiler automatically wires this up as a
     * special _internal_ 'on:begin' callback for modes with `beginKeywords`
     * @param {RegExpMatchArray} match
     * @param {CallbackResponse} response
     */
    function skipIfHasPrecedingDot(match, response) {
      const before = match.input[match.index - 1];
      if (before === ".") {
        response.ignoreMatch();
      }
    }
  
    /**
     *
     * @type {CompilerExt}
     */
    function scopeClassName(mode, _parent) {
      // eslint-disable-next-line no-undefined
      if (mode.className !== undefined) {
        mode.scope = mode.className;
        delete mode.className;
      }
    }
  
    /**
     * `beginKeywords` syntactic sugar
     * @type {CompilerExt}
     */
    function beginKeywords(mode, parent) {
      if (!parent) return;
      if (!mode.beginKeywords) return;
  
      // for languages with keywords that include non-word characters checking for
      // a word boundary is not sufficient, so instead we check for a word boundary
      // or whitespace - this does no harm in any case since our keyword engine
      // doesn't allow spaces in keywords anyways and we still check for the boundary
      // first
      mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')(?!\\.)(?=\\b|\\s)';
      mode.__beforeBegin = skipIfHasPrecedingDot;
      mode.keywords = mode.keywords || mode.beginKeywords;
      delete mode.beginKeywords;
  
      // prevents double relevance, the keywords themselves provide
      // relevance, the mode doesn't need to double it
      // eslint-disable-next-line no-undefined
      if (mode.relevance === undefined) mode.relevance = 0;
    }
  
    /**
     * Allow `illegal` to contain an array of illegal values
     * @type {CompilerExt}
     */
    function compileIllegal(mode, _parent) {
      if (!Array.isArray(mode.illegal)) return;
  
      mode.illegal = either(...mode.illegal);
    }
  
    /**
     * `match` to match a single expression for readability
     * @type {CompilerExt}
     */
    function compileMatch(mode, _parent) {
      if (!mode.match) return;
      if (mode.begin || mode.end) throw new Error("begin & end are not supported with match");
  
      mode.begin = mode.match;
      delete mode.match;
    }
  
    /**
     * provides the default 1 relevance to all modes
     * @type {CompilerExt}
     */
    function compileRelevance(mode, _parent) {
      // eslint-disable-next-line no-undefined
      if (mode.relevance === undefined) mode.relevance = 1;
    }
  
    // allow beforeMatch to act as a "qualifier" for the match
    // the full match begin must be [beforeMatch][begin]
    const beforeMatchExt = (mode, parent) => {
      if (!mode.beforeMatch) return;
      // starts conflicts with endsParent which we need to make sure the child
      // rule is not matched multiple times
      if (mode.starts) throw new Error("beforeMatch cannot be used with starts");
  
      const originalMode = Object.assign({}, mode);
      Object.keys(mode).forEach((key) => { delete mode[key]; });
  
      mode.keywords = originalMode.keywords;
      mode.begin = concat(originalMode.beforeMatch, lookahead(originalMode.begin));
      mode.starts = {
        relevance: 0,
        contains: [
          Object.assign(originalMode, { endsParent: true })
        ]
      };
      mode.relevance = 0;
  
      delete originalMode.beforeMatch;
    };
  
    // keywords that should have no default relevance value
    const COMMON_KEYWORDS = [
      'of',
      'and',
      'for',
      'in',
      'not',
      'or',
      'if',
      'then',
      'parent', // common variable name
      'list', // common variable name
      'value' // common variable name
    ];
  
    const DEFAULT_KEYWORD_SCOPE = "keyword";
  
    /**
     * Given raw keywords from a language definition, compile them.
     *
     * @param {string | Record<string,string|string[]> | Array<string>} rawKeywords
     * @param {boolean} caseInsensitive
     */
    function compileKeywords(rawKeywords, caseInsensitive, scopeName = DEFAULT_KEYWORD_SCOPE) {
      /** @type {import("highlight.js/private").KeywordDict} */
      const compiledKeywords = Object.create(null);
  
      // input can be a string of keywords, an array of keywords, or a object with
      // named keys representing scopeName (which can then point to a string or array)
      if (typeof rawKeywords === 'string') {
        compileList(scopeName, rawKeywords.split(" "));
      } else if (Array.isArray(rawKeywords)) {
        compileList(scopeName, rawKeywords);
      } else {
        Object.keys(rawKeywords).forEach(function(scopeName) {
          // collapse all our objects back into the parent object
          Object.assign(
            compiledKeywords,
            compileKeywords(rawKeywords[scopeName], caseInsensitive, scopeName)
          );
        });
      }
      return compiledKeywords;
  
      // ---
  
      /**
       * Compiles an individual list of keywords
       *
       * Ex: "for if when while|5"
       *
       * @param {string} scopeName
       * @param {Array<string>} keywordList
       */
      function compileList(scopeName, keywordList) {
        if (caseInsensitive) {
          keywordList = keywordList.map(x => x.toLowerCase());
        }
        keywordList.forEach(function(keyword) {
          const pair = keyword.split('|');
          compiledKeywords[pair[0]] = [scopeName, scoreForKeyword(pair[0], pair[1])];
        });
      }
    }
  
    /**
     * Returns the proper score for a given keyword
     *
     * Also takes into account comment keywords, which will be scored 0 UNLESS
     * another score has been manually assigned.
     * @param {string} keyword
     * @param {string} [providedScore]
     */
    function scoreForKeyword(keyword, providedScore) {
      // manual scores always win over common keywords
      // so you can force a score of 1 if you really insist
      if (providedScore) {
        return Number(providedScore);
      }
  
      return commonKeyword(keyword) ? 0 : 1;
    }
  
    /**
     * Determines if a given keyword is common or not
     *
     * @param {string} keyword */
    function commonKeyword(keyword) {
      return COMMON_KEYWORDS.includes(keyword.toLowerCase());
    }
  
    /*
  
    For the reasoning behind this please see:
    https://github.com/highlightjs/highlight.js/issues/2880#issuecomment-747275419
  
    */
  
    /**
     * @type {Record<string, boolean>}
     */
    const seenDeprecations = {};
  
    /**
     * @param {string} message
     */
    const error = (message) => {
      console.error(message);
    };
  
    /**
     * @param {string} message
     * @param {any} args
     */
    const warn = (message, ...args) => {
      console.log(`WARN: ${message}`, ...args);
    };
  
    /**
     * @param {string} version
     * @param {string} message
     */
    const deprecated = (version, message) => {
      if (seenDeprecations[`${version}/${message}`]) return;
  
      console.log(`Deprecated as of ${version}. ${message}`);
      seenDeprecations[`${version}/${message}`] = true;
    };
  
    /* eslint-disable no-throw-literal */
  
    /**
    @typedef {import('highlight.js').CompiledMode} CompiledMode
    */
  
    const MultiClassError = new Error();
  
    /**
     * Renumbers labeled scope names to account for additional inner match
     * groups that otherwise would break everything.
     *
     * Lets say we 3 match scopes:
     *
     *   { 1 => ..., 2 => ..., 3 => ... }
     *
     * So what we need is a clean match like this:
     *
     *   (a)(b)(c) => [ "a", "b", "c" ]
     *
     * But this falls apart with inner match groups:
     *
     * (a)(((b)))(c) => ["a", "b", "b", "b", "c" ]
     *
     * Our scopes are now "out of alignment" and we're repeating `b` 3 times.
     * What needs to happen is the numbers are remapped:
     *
     *   { 1 => ..., 2 => ..., 5 => ... }
     *
     * We also need to know that the ONLY groups that should be output
     * are 1, 2, and 5.  This function handles this behavior.
     *
     * @param {CompiledMode} mode
     * @param {Array<RegExp | string>} regexes
     * @param {{key: "beginScope"|"endScope"}} opts
     */
    function remapScopeNames(mode, regexes, { key }) {
      let offset = 0;
      const scopeNames = mode[key];
      /** @type Record<number,boolean> */
      const emit = {};
      /** @type Record<number,string> */
      const positions = {};
  
      for (let i = 1; i <= regexes.length; i++) {
        positions[i + offset] = scopeNames[i];
        emit[i + offset] = true;
        offset += countMatchGroups(regexes[i - 1]);
      }
      // we use _emit to keep track of which match groups are "top-level" to avoid double
      // output from inside match groups
      mode[key] = positions;
      mode[key]._emit = emit;
      mode[key]._multi = true;
    }
  
    /**
     * @param {CompiledMode} mode
     */
    function beginMultiClass(mode) {
      if (!Array.isArray(mode.begin)) return;
  
      if (mode.skip || mode.excludeBegin || mode.returnBegin) {
        error("skip, excludeBegin, returnBegin not compatible with beginScope: {}");
        throw MultiClassError;
      }
  
      if (typeof mode.beginScope !== "object" || mode.beginScope === null) {
        error("beginScope must be object");
        throw MultiClassError;
      }
  
      remapScopeNames(mode, mode.begin, { key: "beginScope" });
      mode.begin = _rewriteBackreferences(mode.begin, { joinWith: "" });
    }
  
    /**
     * @param {CompiledMode} mode
     */
    function endMultiClass(mode) {
      if (!Array.isArray(mode.end)) return;
  
      if (mode.skip || mode.excludeEnd || mode.returnEnd) {
        error("skip, excludeEnd, returnEnd not compatible with endScope: {}");
        throw MultiClassError;
      }
  
      if (typeof mode.endScope !== "object" || mode.endScope === null) {
        error("endScope must be object");
        throw MultiClassError;
      }
  
      remapScopeNames(mode, mode.end, { key: "endScope" });
      mode.end = _rewriteBackreferences(mode.end, { joinWith: "" });
    }
  
    /**
     * this exists only to allow `scope: {}` to be used beside `match:`
     * Otherwise `beginScope` would necessary and that would look weird
  
      {
        match: [ /def/, /\w+/ ]
        scope: { 1: "keyword" , 2: "title" }
      }
  
     * @param {CompiledMode} mode
     */
    function scopeSugar(mode) {
      if (mode.scope && typeof mode.scope === "object" && mode.scope !== null) {
        mode.beginScope = mode.scope;
        delete mode.scope;
      }
    }
  
    /**
     * @param {CompiledMode} mode
     */
    function MultiClass(mode) {
      scopeSugar(mode);
  
      if (typeof mode.beginScope === "string") {
        mode.beginScope = { _wrap: mode.beginScope };
      }
      if (typeof mode.endScope === "string") {
        mode.endScope = { _wrap: mode.endScope };
      }
  
      beginMultiClass(mode);
      endMultiClass(mode);
    }
  
    /**
    @typedef {import('highlight.js').Mode} Mode
    @typedef {import('highlight.js').CompiledMode} CompiledMode
    @typedef {import('highlight.js').Language} Language
    @typedef {import('highlight.js').HLJSPlugin} HLJSPlugin
    @typedef {import('highlight.js').CompiledLanguage} CompiledLanguage
    */
  
    // compilation
  
    /**
     * Compiles a language definition result
     *
     * Given the raw result of a language definition (Language), compiles this so
     * that it is ready for highlighting code.
     * @param {Language} language
     * @returns {CompiledLanguage}
     */
    function compileLanguage(language) {
      /**
       * Builds a regex with the case sensitivity of the current language
       *
       * @param {RegExp | string} value
       * @param {boolean} [global]
       */
      function langRe(value, global) {
        return new RegExp(
          source(value),
          'm'
          + (language.case_insensitive ? 'i' : '')
          + (language.unicodeRegex ? 'u' : '')
          + (global ? 'g' : '')
        );
      }
  
      /**
        Stores multiple regular expressions and allows you to quickly search for
        them all in a string simultaneously - returning the first match.  It does
        this by creating a huge (a|b|c) regex - each individual item wrapped with ()
        and joined by `|` - using match groups to track position.  When a match is
        found checking which position in the array has content allows us to figure
        out which of the original regexes / match groups triggered the match.
  
        The match object itself (the result of `Regex.exec`) is returned but also
        enhanced by merging in any meta-data that was registered with the regex.
        This is how we keep track of which mode matched, and what type of rule
        (`illegal`, `begin`, end, etc).
      */
      class MultiRegex {
        constructor() {
          this.matchIndexes = {};
          // @ts-ignore
          this.regexes = [];
          this.matchAt = 1;
          this.position = 0;
        }
  
        // @ts-ignore
        addRule(re, opts) {
          opts.position = this.position++;
          // @ts-ignore
          this.matchIndexes[this.matchAt] = opts;
          this.regexes.push([opts, re]);
          this.matchAt += countMatchGroups(re) + 1;
        }
  
        compile() {
          if (this.regexes.length === 0) {
            // avoids the need to check length every time exec is called
            // @ts-ignore
            this.exec = () => null;
          }
          const terminators = this.regexes.map(el => el[1]);
          this.matcherRe = langRe(_rewriteBackreferences(terminators, { joinWith: '|' }), true);
          this.lastIndex = 0;
        }
  
        /** @param {string} s */
        exec(s) {
          this.matcherRe.lastIndex = this.lastIndex;
          const match = this.matcherRe.exec(s);
          if (!match) { return null; }
  
          // eslint-disable-next-line no-undefined
          const i = match.findIndex((el, i) => i > 0 && el !== undefined);
          // @ts-ignore
          const matchData = this.matchIndexes[i];
          // trim off any earlier non-relevant match groups (ie, the other regex
          // match groups that make up the multi-matcher)
          match.splice(0, i);
  
          return Object.assign(match, matchData);
        }
      }
  
      /*
        Created to solve the key deficiently with MultiRegex - there is no way to
        test for multiple matches at a single location.  Why would we need to do
        that?  In the future a more dynamic engine will allow certain matches to be
        ignored.  An example: if we matched say the 3rd regex in a large group but
        decided to ignore it - we'd need to started testing again at the 4th
        regex... but MultiRegex itself gives us no real way to do that.
  
        So what this class creates MultiRegexs on the fly for whatever search
        position they are needed.
  
        NOTE: These additional MultiRegex objects are created dynamically.  For most
        grammars most of the time we will never actually need anything more than the
        first MultiRegex - so this shouldn't have too much overhead.
  
        Say this is our search group, and we match regex3, but wish to ignore it.
  
          regex1 | regex2 | regex3 | regex4 | regex5    ' ie, startAt = 0
  
        What we need is a new MultiRegex that only includes the remaining
        possibilities:
  
          regex4 | regex5                               ' ie, startAt = 3
  
        This class wraps all that complexity up in a simple API... `startAt` decides
        where in the array of expressions to start doing the matching. It
        auto-increments, so if a match is found at position 2, then startAt will be
        set to 3.  If the end is reached startAt will return to 0.
  
        MOST of the time the parser will be setting startAt manually to 0.
      */
      class ResumableMultiRegex {
        constructor() {
          // @ts-ignore
          this.rules = [];
          // @ts-ignore
          this.multiRegexes = [];
          this.count = 0;
  
          this.lastIndex = 0;
          this.regexIndex = 0;
        }
  
        // @ts-ignore
        getMatcher(index) {
          if (this.multiRegexes[index]) return this.multiRegexes[index];
  
          const matcher = new MultiRegex();
          this.rules.slice(index).forEach(([re, opts]) => matcher.addRule(re, opts));
          matcher.compile();
          this.multiRegexes[index] = matcher;
          return matcher;
        }
  
        resumingScanAtSamePosition() {
          return this.regexIndex !== 0;
        }
  
        considerAll() {
          this.regexIndex = 0;
        }
  
        // @ts-ignore
        addRule(re, opts) {
          this.rules.push([re, opts]);
          if (opts.type === "begin") this.count++;
        }
  
        /** @param {string} s */
        exec(s) {
          const m = this.getMatcher(this.regexIndex);
          m.lastIndex = this.lastIndex;
          let result = m.exec(s);
  
          // The following is because we have no easy way to say "resume scanning at the
          // existing position but also skip the current rule ONLY". What happens is
          // all prior rules are also skipped which can result in matching the wrong
          // thing. Example of matching "booger":
  
          // our matcher is [string, "booger", number]
          //
          // ....booger....
  
          // if "booger" is ignored then we'd really need a regex to scan from the
          // SAME position for only: [string, number] but ignoring "booger" (if it
          // was the first match), a simple resume would scan ahead who knows how
          // far looking only for "number", ignoring potential string matches (or
          // future "booger" matches that might be valid.)
  
          // So what we do: We execute two matchers, one resuming at the same
          // position, but the second full matcher starting at the position after:
  
          //     /--- resume first regex match here (for [number])
          //     |/---- full match here for [string, "booger", number]
          //     vv
          // ....booger....
  
          // Which ever results in a match first is then used. So this 3-4 step
          // process essentially allows us to say "match at this position, excluding
          // a prior rule that was ignored".
          //
          // 1. Match "booger" first, ignore. Also proves that [string] does non match.
          // 2. Resume matching for [number]
          // 3. Match at index + 1 for [string, "booger", number]
          // 4. If #2 and #3 result in matches, which came first?
          if (this.resumingScanAtSamePosition()) {
            if (result && result.index === this.lastIndex) ; else { // use the second matcher result
              const m2 = this.getMatcher(0);
              m2.lastIndex = this.lastIndex + 1;
              result = m2.exec(s);
            }
          }
  
          if (result) {
            this.regexIndex += result.position + 1;
            if (this.regexIndex === this.count) {
              // wrap-around to considering all matches again
              this.considerAll();
            }
          }
  
          return result;
        }
      }
  
      /**
       * Given a mode, builds a huge ResumableMultiRegex that can be used to walk
       * the content and find matches.
       *
       * @param {CompiledMode} mode
       * @returns {ResumableMultiRegex}
       */
      function buildModeRegex(mode) {
        const mm = new ResumableMultiRegex();
  
        mode.contains.forEach(term => mm.addRule(term.begin, { rule: term, type: "begin" }));
  
        if (mode.terminatorEnd) {
          mm.addRule(mode.terminatorEnd, { type: "end" });
        }
        if (mode.illegal) {
          mm.addRule(mode.illegal, { type: "illegal" });
        }
  
        return mm;
      }
  
      /** skip vs abort vs ignore
       *
       * @skip   - The mode is still entered and exited normally (and contains rules apply),
       *           but all content is held and added to the parent buffer rather than being
       *           output when the mode ends.  Mostly used with `sublanguage` to build up
       *           a single large buffer than can be parsed by sublanguage.
       *
       *             - The mode begin ands ends normally.
       *             - Content matched is added to the parent mode buffer.
       *             - The parser cursor is moved forward normally.
       *
       * @abort  - A hack placeholder until we have ignore.  Aborts the mode (as if it
       *           never matched) but DOES NOT continue to match subsequent `contains`
       *           modes.  Abort is bad/suboptimal because it can result in modes
       *           farther down not getting applied because an earlier rule eats the
       *           content but then aborts.
       *
       *             - The mode does not begin.
       *             - Content matched by `begin` is added to the mode buffer.
       *             - The parser cursor is moved forward accordingly.
       *
       * @ignore - Ignores the mode (as if it never matched) and continues to match any
       *           subsequent `contains` modes.  Ignore isn't technically possible with
       *           the current parser implementation.
       *
       *             - The mode does not begin.
       *             - Content matched by `begin` is ignored.
       *             - The parser cursor is not moved forward.
       */
  
      /**
       * Compiles an individual mode
       *
       * This can raise an error if the mode contains certain detectable known logic
       * issues.
       * @param {Mode} mode
       * @param {CompiledMode | null} [parent]
       * @returns {CompiledMode | never}
       */
      function compileMode(mode, parent) {
        const cmode = /** @type CompiledMode */ (mode);
        if (mode.isCompiled) return cmode;
  
        [
          scopeClassName,
          // do this early so compiler extensions generally don't have to worry about
          // the distinction between match/begin
          compileMatch,
          MultiClass,
          beforeMatchExt
        ].forEach(ext => ext(mode, parent));
  
        language.compilerExtensions.forEach(ext => ext(mode, parent));
  
        // __beforeBegin is considered private API, internal use only
        mode.__beforeBegin = null;
  
        [
          beginKeywords,
          // do this later so compiler extensions that come earlier have access to the
          // raw array if they wanted to perhaps manipulate it, etc.
          compileIllegal,
          // default to 1 relevance if not specified
          compileRelevance
        ].forEach(ext => ext(mode, parent));
  
        mode.isCompiled = true;
  
        let keywordPattern = null;
        if (typeof mode.keywords === "object" && mode.keywords.$pattern) {
          // we need a copy because keywords might be compiled multiple times
          // so we can't go deleting $pattern from the original on the first
          // pass
          mode.keywords = Object.assign({}, mode.keywords);
          keywordPattern = mode.keywords.$pattern;
          delete mode.keywords.$pattern;
        }
        keywordPattern = keywordPattern || /\w+/;
  
        if (mode.keywords) {
          mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);
        }
  
        cmode.keywordPatternRe = langRe(keywordPattern, true);
  
        if (parent) {
          if (!mode.begin) mode.begin = /\B|\b/;
          cmode.beginRe = langRe(cmode.begin);
          if (!mode.end && !mode.endsWithParent) mode.end = /\B|\b/;
          if (mode.end) cmode.endRe = langRe(cmode.end);
          cmode.terminatorEnd = source(cmode.end) || '';
          if (mode.endsWithParent && parent.terminatorEnd) {
            cmode.terminatorEnd += (mode.end ? '|' : '') + parent.terminatorEnd;
          }
        }
        if (mode.illegal) cmode.illegalRe = langRe(/** @type {RegExp | string} */ (mode.illegal));
        if (!mode.contains) mode.contains = [];
  
        mode.contains = [].concat(...mode.contains.map(function(c) {
          return expandOrCloneMode(c === 'self' ? mode : c);
        }));
        mode.contains.forEach(function(c) { compileMode(/** @type Mode */ (c), cmode); });
  
        if (mode.starts) {
          compileMode(mode.starts, parent);
        }
  
        cmode.matcher = buildModeRegex(cmode);
        return cmode;
      }
  
      if (!language.compilerExtensions) language.compilerExtensions = [];
  
      // self is not valid at the top-level
      if (language.contains && language.contains.includes('self')) {
        throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");
      }
  
      // we need a null object, which inherit will guarantee
      language.classNameAliases = inherit$1(language.classNameAliases || {});
  
      return compileMode(/** @type Mode */ (language));
    }
  
    /**
     * Determines if a mode has a dependency on it's parent or not
     *
     * If a mode does have a parent dependency then often we need to clone it if
     * it's used in multiple places so that each copy points to the correct parent,
     * where-as modes without a parent can often safely be re-used at the bottom of
     * a mode chain.
     *
     * @param {Mode | null} mode
     * @returns {boolean} - is there a dependency on the parent?
     * */
    function dependencyOnParent(mode) {
      if (!mode) return false;
  
      return mode.endsWithParent || dependencyOnParent(mode.starts);
    }
  
    /**
     * Expands a mode or clones it if necessary
     *
     * This is necessary for modes with parental dependenceis (see notes on
     * `dependencyOnParent`) and for nodes that have `variants` - which must then be
     * exploded into their own individual modes at compile time.
     *
     * @param {Mode} mode
     * @returns {Mode | Mode[]}
     * */
    function expandOrCloneMode(mode) {
      if (mode.variants && !mode.cachedVariants) {
        mode.cachedVariants = mode.variants.map(function(variant) {
          return inherit$1(mode, { variants: null }, variant);
        });
      }
  
      // EXPAND
      // if we have variants then essentially "replace" the mode with the variants
      // this happens in compileMode, where this function is called from
      if (mode.cachedVariants) {
        return mode.cachedVariants;
      }
  
      // CLONE
      // if we have dependencies on parents then we need a unique
      // instance of ourselves, so we can be reused with many
      // different parents without issue
      if (dependencyOnParent(mode)) {
        return inherit$1(mode, { starts: mode.starts ? inherit$1(mode.starts) : null });
      }
  
      if (Object.isFrozen(mode)) {
        return inherit$1(mode);
      }
  
      // no special dependency issues, just return ourselves
      return mode;
    }
  
    var version = "11.8.0";
  
    class HTMLInjectionError extends Error {
      constructor(reason, html) {
        super(reason);
        this.name = "HTMLInjectionError";
        this.html = html;
      }
    }
  
    /*
    Syntax highlighting with language autodetection.
    https://highlightjs.org/
    */
  
  
    /**
    @typedef {import('highlight.js').Mode} Mode
    @typedef {import('highlight.js').CompiledMode} CompiledMode
    @typedef {import('highlight.js').CompiledScope} CompiledScope
    @typedef {import('highlight.js').Language} Language
    @typedef {import('highlight.js').HLJSApi} HLJSApi
    @typedef {import('highlight.js').HLJSPlugin} HLJSPlugin
    @typedef {import('highlight.js').PluginEvent} PluginEvent
    @typedef {import('highlight.js').HLJSOptions} HLJSOptions
    @typedef {import('highlight.js').LanguageFn} LanguageFn
    @typedef {import('highlight.js').HighlightedHTMLElement} HighlightedHTMLElement
    @typedef {import('highlight.js').BeforeHighlightContext} BeforeHighlightContext
    @typedef {import('highlight.js/private').MatchType} MatchType
    @typedef {import('highlight.js/private').KeywordData} KeywordData
    @typedef {import('highlight.js/private').EnhancedMatch} EnhancedMatch
    @typedef {import('highlight.js/private').AnnotatedError} AnnotatedError
    @typedef {import('highlight.js').AutoHighlightResult} AutoHighlightResult
    @typedef {import('highlight.js').HighlightOptions} HighlightOptions
    @typedef {import('highlight.js').HighlightResult} HighlightResult
    */
  
  
    const escape = escapeHTML;
    const inherit = inherit$1;
    const NO_MATCH = Symbol("nomatch");
    const MAX_KEYWORD_HITS = 7;
  
    /**
     * @param {any} hljs - object that is extended (legacy)
     * @returns {HLJSApi}
     */
    const HLJS = function(hljs) {
      // Global internal variables used within the highlight.js library.
      /** @type {Record<string, Language>} */
      const languages = Object.create(null);
      /** @type {Record<string, string>} */
      const aliases = Object.create(null);
      /** @type {HLJSPlugin[]} */
      const plugins = [];
  
      // safe/production mode - swallows more errors, tries to keep running
      // even if a single syntax or parse hits a fatal error
      let SAFE_MODE = true;
      const LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";
      /** @type {Language} */
      const PLAINTEXT_LANGUAGE = { disableAutodetect: true, name: 'Plain text', contains: [] };
  
      // Global options used when within external APIs. This is modified when
      // calling the `hljs.configure` function.
      /** @type HLJSOptions */
      let options = {
        ignoreUnescapedHTML: false,
        throwUnescapedHTML: false,
        noHighlightRe: /^(no-?highlight)$/i,
        languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
        classPrefix: 'hljs-',
        cssSelector: 'pre code',
        languages: null,
        // beta configuration options, subject to change, welcome to discuss
        // https://github.com/highlightjs/highlight.js/issues/1086
        __emitter: TokenTreeEmitter
      };
  
      /* Utility functions */
  
      /**
       * Tests a language name to see if highlighting should be skipped
       * @param {string} languageName
       */
      function shouldNotHighlight(languageName) {
        return options.noHighlightRe.test(languageName);
      }
  
      /**
       * @param {HighlightedHTMLElement} block - the HTML element to determine language for
       */
      function blockLanguage(block) {
        let classes = block.className + ' ';
  
        classes += block.parentNode ? block.parentNode.className : '';
  
        // language-* takes precedence over non-prefixed class names.
        const match = options.languageDetectRe.exec(classes);
        if (match) {
          const language = getLanguage(match[1]);
          if (!language) {
            warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
            warn("Falling back to no-highlight mode for this block.", block);
          }
          return language ? match[1] : 'no-highlight';
        }
  
        return classes
          .split(/\s+/)
          .find((_class) => shouldNotHighlight(_class) || getLanguage(_class));
      }
  
      /**
       * Core highlighting function.
       *
       * OLD API
       * highlight(lang, code, ignoreIllegals, continuation)
       *
       * NEW API
       * highlight(code, {lang, ignoreIllegals})
       *
       * @param {string} codeOrLanguageName - the language to use for highlighting
       * @param {string | HighlightOptions} optionsOrCode - the code to highlight
       * @param {boolean} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
       *
       * @returns {HighlightResult} Result - an object that represents the result
       * @property {string} language - the language name
       * @property {number} relevance - the relevance score
       * @property {string} value - the highlighted HTML code
       * @property {string} code - the original raw code
       * @property {CompiledMode} top - top of the current mode stack
       * @property {boolean} illegal - indicates whether any illegal matches were found
      */
      function highlight(codeOrLanguageName, optionsOrCode, ignoreIllegals) {
        let code = "";
        let languageName = "";
        if (typeof optionsOrCode === "object") {
          code = codeOrLanguageName;
          ignoreIllegals = optionsOrCode.ignoreIllegals;
          languageName = optionsOrCode.language;
        } else {
          // old API
          deprecated("10.7.0", "highlight(lang, code, ...args) has been deprecated.");
          deprecated("10.7.0", "Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277");
          languageName = codeOrLanguageName;
          code = optionsOrCode;
        }
  
        // https://github.com/highlightjs/highlight.js/issues/3149
        // eslint-disable-next-line no-undefined
        if (ignoreIllegals === undefined) { ignoreIllegals = true; }
  
        /** @type {BeforeHighlightContext} */
        const context = {
          code,
          language: languageName
        };
        // the plugin can change the desired language or the code to be highlighted
        // just be changing the object it was passed
        fire("before:highlight", context);
  
        // a before plugin can usurp the result completely by providing it's own
        // in which case we don't even need to call highlight
        const result = context.result
          ? context.result
          : _highlight(context.language, context.code, ignoreIllegals);
  
        result.code = context.code;
        // the plugin can change anything in result to suite it
        fire("after:highlight", result);
  
        return result;
      }
  
      /**
       * private highlight that's used internally and does not fire callbacks
       *
       * @param {string} languageName - the language to use for highlighting
       * @param {string} codeToHighlight - the code to highlight
       * @param {boolean?} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
       * @param {CompiledMode?} [continuation] - current continuation mode, if any
       * @returns {HighlightResult} - result of the highlight operation
      */
      function _highlight(languageName, codeToHighlight, ignoreIllegals, continuation) {
        const keywordHits = Object.create(null);
  
        /**
         * Return keyword data if a match is a keyword
         * @param {CompiledMode} mode - current mode
         * @param {string} matchText - the textual match
         * @returns {KeywordData | false}
         */
        function keywordData(mode, matchText) {
          return mode.keywords[matchText];
        }
  
        function processKeywords() {
          if (!top.keywords) {
            emitter.addText(modeBuffer);
            return;
          }
  
          let lastIndex = 0;
          top.keywordPatternRe.lastIndex = 0;
          let match = top.keywordPatternRe.exec(modeBuffer);
          let buf = "";
  
          while (match) {
            buf += modeBuffer.substring(lastIndex, match.index);
            const word = language.case_insensitive ? match[0].toLowerCase() : match[0];
            const data = keywordData(top, word);
            if (data) {
              const [kind, keywordRelevance] = data;
              emitter.addText(buf);
              buf = "";
  
              keywordHits[word] = (keywordHits[word] || 0) + 1;
              if (keywordHits[word] <= MAX_KEYWORD_HITS) relevance += keywordRelevance;
              if (kind.startsWith("_")) {
                // _ implied for relevance only, do not highlight
                // by applying a class name
                buf += match[0];
              } else {
                const cssClass = language.classNameAliases[kind] || kind;
                emitKeyword(match[0], cssClass);
              }
            } else {
              buf += match[0];
            }
            lastIndex = top.keywordPatternRe.lastIndex;
            match = top.keywordPatternRe.exec(modeBuffer);
          }
          buf += modeBuffer.substring(lastIndex);
          emitter.addText(buf);
        }
  
        function processSubLanguage() {
          if (modeBuffer === "") return;
          /** @type HighlightResult */
          let result = null;
  
          if (typeof top.subLanguage === 'string') {
            if (!languages[top.subLanguage]) {
              emitter.addText(modeBuffer);
              return;
            }
            result = _highlight(top.subLanguage, modeBuffer, true, continuations[top.subLanguage]);
            continuations[top.subLanguage] = /** @type {CompiledMode} */ (result._top);
          } else {
            result = highlightAuto(modeBuffer, top.subLanguage.length ? top.subLanguage : null);
          }
  
          // Counting embedded language score towards the host language may be disabled
          // with zeroing the containing mode relevance. Use case in point is Markdown that
          // allows XML everywhere and makes every XML snippet to have a much larger Markdown
          // score.
          if (top.relevance > 0) {
            relevance += result.relevance;
          }
          emitter.__addSublanguage(result._emitter, result.language);
        }
  
        function processBuffer() {
          if (top.subLanguage != null) {
            processSubLanguage();
          } else {
            processKeywords();
          }
          modeBuffer = '';
        }
  
        /**
         * @param {string} text
         * @param {string} scope
         */
        function emitKeyword(keyword, scope) {
          if (keyword === "") return;
  
          emitter.startScope(scope);
          emitter.addText(keyword);
          emitter.endScope();
        }
  
        /**
         * @param {CompiledScope} scope
         * @param {RegExpMatchArray} match
         */
        function emitMultiClass(scope, match) {
          let i = 1;
          const max = match.length - 1;
          while (i <= max) {
            if (!scope._emit[i]) { i++; continue; }
            const klass = language.classNameAliases[scope[i]] || scope[i];
            const text = match[i];
            if (klass) {
              emitKeyword(text, klass);
            } else {
              modeBuffer = text;
              processKeywords();
              modeBuffer = "";
            }
            i++;
          }
        }
  
        /**
         * @param {CompiledMode} mode - new mode to start
         * @param {RegExpMatchArray} match
         */
        function startNewMode(mode, match) {
          if (mode.scope && typeof mode.scope === "string") {
            emitter.openNode(language.classNameAliases[mode.scope] || mode.scope);
          }
          if (mode.beginScope) {
            // beginScope just wraps the begin match itself in a scope
            if (mode.beginScope._wrap) {
              emitKeyword(modeBuffer, language.classNameAliases[mode.beginScope._wrap] || mode.beginScope._wrap);
              modeBuffer = "";
            } else if (mode.beginScope._multi) {
              // at this point modeBuffer should just be the match
              emitMultiClass(mode.beginScope, match);
              modeBuffer = "";
            }
          }
  
          top = Object.create(mode, { parent: { value: top } });
          return top;
        }
  
        /**
         * @param {CompiledMode } mode - the mode to potentially end
         * @param {RegExpMatchArray} match - the latest match
         * @param {string} matchPlusRemainder - match plus remainder of content
         * @returns {CompiledMode | void} - the next mode, or if void continue on in current mode
         */
        function endOfMode(mode, match, matchPlusRemainder) {
          let matched = startsWith(mode.endRe, matchPlusRemainder);
  
          if (matched) {
            if (mode["on:end"]) {
              const resp = new Response(mode);
              mode["on:end"](match, resp);
              if (resp.isMatchIgnored) matched = false;
            }
  
            if (matched) {
              while (mode.endsParent && mode.parent) {
                mode = mode.parent;
              }
              return mode;
            }
          }
          // even if on:end fires an `ignore` it's still possible
          // that we might trigger the end node because of a parent mode
          if (mode.endsWithParent) {
            return endOfMode(mode.parent, match, matchPlusRemainder);
          }
        }
  
        /**
         * Handle matching but then ignoring a sequence of text
         *
         * @param {string} lexeme - string containing full match text
         */
        function doIgnore(lexeme) {
          if (top.matcher.regexIndex === 0) {
            // no more regexes to potentially match here, so we move the cursor forward one
            // space
            modeBuffer += lexeme[0];
            return 1;
          } else {
            // no need to move the cursor, we still have additional regexes to try and
            // match at this very spot
            resumeScanAtSamePosition = true;
            return 0;
          }
        }
  
        /**
         * Handle the start of a new potential mode match
         *
         * @param {EnhancedMatch} match - the current match
         * @returns {number} how far to advance the parse cursor
         */
        function doBeginMatch(match) {
          const lexeme = match[0];
          const newMode = match.rule;
  
          const resp = new Response(newMode);
          // first internal before callbacks, then the public ones
          const beforeCallbacks = [newMode.__beforeBegin, newMode["on:begin"]];
          for (const cb of beforeCallbacks) {
            if (!cb) continue;
            cb(match, resp);
            if (resp.isMatchIgnored) return doIgnore(lexeme);
          }
  
          if (newMode.skip) {
            modeBuffer += lexeme;
          } else {
            if (newMode.excludeBegin) {
              modeBuffer += lexeme;
            }
            processBuffer();
            if (!newMode.returnBegin && !newMode.excludeBegin) {
              modeBuffer = lexeme;
            }
          }
          startNewMode(newMode, match);
          return newMode.returnBegin ? 0 : lexeme.length;
        }
  
        /**
         * Handle the potential end of mode
         *
         * @param {RegExpMatchArray} match - the current match
         */
        function doEndMatch(match) {
          const lexeme = match[0];
          const matchPlusRemainder = codeToHighlight.substring(match.index);
  
          const endMode = endOfMode(top, match, matchPlusRemainder);
          if (!endMode) { return NO_MATCH; }
  
          const origin = top;
          if (top.endScope && top.endScope._wrap) {
            processBuffer();
            emitKeyword(lexeme, top.endScope._wrap);
          } else if (top.endScope && top.endScope._multi) {
            processBuffer();
            emitMultiClass(top.endScope, match);
          } else if (origin.skip) {
            modeBuffer += lexeme;
          } else {
            if (!(origin.returnEnd || origin.excludeEnd)) {
              modeBuffer += lexeme;
            }
            processBuffer();
            if (origin.excludeEnd) {
              modeBuffer = lexeme;
            }
          }
          do {
            if (top.scope) {
              emitter.closeNode();
            }
            if (!top.skip && !top.subLanguage) {
              relevance += top.relevance;
            }
            top = top.parent;
          } while (top !== endMode.parent);
          if (endMode.starts) {
            startNewMode(endMode.starts, match);
          }
          return origin.returnEnd ? 0 : lexeme.length;
        }
  
        function processContinuations() {
          const list = [];
          for (let current = top; current !== language; current = current.parent) {
            if (current.scope) {
              list.unshift(current.scope);
            }
          }
          list.forEach(item => emitter.openNode(item));
        }
  
        /** @type {{type?: MatchType, index?: number, rule?: Mode}}} */
        let lastMatch = {};
  
        /**
         *  Process an individual match
         *
         * @param {string} textBeforeMatch - text preceding the match (since the last match)
         * @param {EnhancedMatch} [match] - the match itself
         */
        function processLexeme(textBeforeMatch, match) {
          const lexeme = match && match[0];
  
          // add non-matched text to the current mode buffer
          modeBuffer += textBeforeMatch;
  
          if (lexeme == null) {
            processBuffer();
            return 0;
          }
  
          // we've found a 0 width match and we're stuck, so we need to advance
          // this happens when we have badly behaved rules that have optional matchers to the degree that
          // sometimes they can end up matching nothing at all
          // Ref: https://github.com/highlightjs/highlight.js/issues/2140
          if (lastMatch.type === "begin" && match.type === "end" && lastMatch.index === match.index && lexeme === "") {
            // spit the "skipped" character that our regex choked on back into the output sequence
            modeBuffer += codeToHighlight.slice(match.index, match.index + 1);
            if (!SAFE_MODE) {
              /** @type {AnnotatedError} */
              const err = new Error(`0 width match regex (${languageName})`);
              err.languageName = languageName;
              err.badRule = lastMatch.rule;
              throw err;
            }
            return 1;
          }
          lastMatch = match;
  
          if (match.type === "begin") {
            return doBeginMatch(match);
          } else if (match.type === "illegal" && !ignoreIllegals) {
            // illegal match, we do not continue processing
            /** @type {AnnotatedError} */
            const err = new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.scope || '<unnamed>') + '"');
            err.mode = top;
            throw err;
          } else if (match.type === "end") {
            const processed = doEndMatch(match);
            if (processed !== NO_MATCH) {
              return processed;
            }
          }
  
          // edge case for when illegal matches $ (end of line) which is technically
          // a 0 width match but not a begin/end match so it's not caught by the
          // first handler (when ignoreIllegals is true)
          if (match.type === "illegal" && lexeme === "") {
            // advance so we aren't stuck in an infinite loop
            return 1;
          }
  
          // infinite loops are BAD, this is a last ditch catch all. if we have a
          // decent number of iterations yet our index (cursor position in our
          // parsing) still 3x behind our index then something is very wrong
          // so we bail
          if (iterations > 100000 && iterations > match.index * 3) {
            const err = new Error('potential infinite loop, way more iterations than matches');
            throw err;
          }
  
          /*
          Why might be find ourselves here?  An potential end match that was
          triggered but could not be completed.  IE, `doEndMatch` returned NO_MATCH.
          (this could be because a callback requests the match be ignored, etc)
  
          This causes no real harm other than stopping a few times too many.
          */
  
          modeBuffer += lexeme;
          return lexeme.length;
        }
  
        const language = getLanguage(languageName);
        if (!language) {
          error(LANGUAGE_NOT_FOUND.replace("{}", languageName));
          throw new Error('Unknown language: "' + languageName + '"');
        }
  
        const md = compileLanguage(language);
        let result = '';
        /** @type {CompiledMode} */
        let top = continuation || md;
        /** @type Record<string,CompiledMode> */
        const continuations = {}; // keep continuations for sub-languages
        const emitter = new options.__emitter(options);
        processContinuations();
        let modeBuffer = '';
        let relevance = 0;
        let index = 0;
        let iterations = 0;
        let resumeScanAtSamePosition = false;
  
        try {
          if (!language.__emitTokens) {
            top.matcher.considerAll();
  
            for (;;) {
              iterations++;
              if (resumeScanAtSamePosition) {
                // only regexes not matched previously will now be
                // considered for a potential match
                resumeScanAtSamePosition = false;
              } else {
                top.matcher.considerAll();
              }
              top.matcher.lastIndex = index;
  
              const match = top.matcher.exec(codeToHighlight);
              // console.log("match", match[0], match.rule && match.rule.begin)
  
              if (!match) break;
  
              const beforeMatch = codeToHighlight.substring(index, match.index);
              const processedCount = processLexeme(beforeMatch, match);
              index = match.index + processedCount;
            }
            processLexeme(codeToHighlight.substring(index));
          } else {
            language.__emitTokens(codeToHighlight, emitter);
          }
  
          emitter.finalize();
          result = emitter.toHTML();
  
          return {
            language: languageName,
            value: result,
            relevance,
            illegal: false,
            _emitter: emitter,
            _top: top
          };
        } catch (err) {
          if (err.message && err.message.includes('Illegal')) {
            return {
              language: languageName,
              value: escape(codeToHighlight),
              illegal: true,
              relevance: 0,
              _illegalBy: {
                message: err.message,
                index,
                context: codeToHighlight.slice(index - 100, index + 100),
                mode: err.mode,
                resultSoFar: result
              },
              _emitter: emitter
            };
          } else if (SAFE_MODE) {
            return {
              language: languageName,
              value: escape(codeToHighlight),
              illegal: false,
              relevance: 0,
              errorRaised: err,
              _emitter: emitter,
              _top: top
            };
          } else {
            throw err;
          }
        }
      }
  
      /**
       * returns a valid highlight result, without actually doing any actual work,
       * auto highlight starts with this and it's possible for small snippets that
       * auto-detection may not find a better match
       * @param {string} code
       * @returns {HighlightResult}
       */
      function justTextHighlightResult(code) {
        const result = {
          value: escape(code),
          illegal: false,
          relevance: 0,
          _top: PLAINTEXT_LANGUAGE,
          _emitter: new options.__emitter(options)
        };
        result._emitter.addText(code);
        return result;
      }
  
      /**
      Highlighting with language detection. Accepts a string with the code to
      highlight. Returns an object with the following properties:
  
      - language (detected language)
      - relevance (int)
      - value (an HTML string with highlighting markup)
      - secondBest (object with the same structure for second-best heuristically
        detected language, may be absent)
  
        @param {string} code
        @param {Array<string>} [languageSubset]
        @returns {AutoHighlightResult}
      */
      function highlightAuto(code, languageSubset) {
        languageSubset = languageSubset || options.languages || Object.keys(languages);
        const plaintext = justTextHighlightResult(code);
  
        const results = languageSubset.filter(getLanguage).filter(autoDetection).map(name =>
          _highlight(name, code, false)
        );
        results.unshift(plaintext); // plaintext is always an option
  
        const sorted = results.sort((a, b) => {
          // sort base on relevance
          if (a.relevance !== b.relevance) return b.relevance - a.relevance;
  
          // always award the tie to the base language
          // ie if C++ and Arduino are tied, it's more likely to be C++
          if (a.language && b.language) {
            if (getLanguage(a.language).supersetOf === b.language) {
              return 1;
            } else if (getLanguage(b.language).supersetOf === a.language) {
              return -1;
            }
          }
  
          // otherwise say they are equal, which has the effect of sorting on
          // relevance while preserving the original ordering - which is how ties
          // have historically been settled, ie the language that comes first always
          // wins in the case of a tie
          return 0;
        });
  
        const [best, secondBest] = sorted;
  
        /** @type {AutoHighlightResult} */
        const result = best;
        result.secondBest = secondBest;
  
        return result;
      }
  
      /**
       * Builds new class name for block given the language name
       *
       * @param {HTMLElement} element
       * @param {string} [currentLang]
       * @param {string} [resultLang]
       */
      function updateClassName(element, currentLang, resultLang) {
        const language = (currentLang && aliases[currentLang]) || resultLang;
  
        element.classList.add("hljs");
        element.classList.add(`language-${language}`);
      }
  
      /**
       * Applies highlighting to a DOM node containing code.
       *
       * @param {HighlightedHTMLElement} element - the HTML element to highlight
      */
      function highlightElement(element) {
        /** @type HTMLElement */
        let node = null;
        const language = blockLanguage(element);
  
        if (shouldNotHighlight(language)) return;
  
        fire("before:highlightElement",
          { el: element, language });
  
        // we should be all text, no child nodes (unescaped HTML) - this is possibly
        // an HTML injection attack - it's likely too late if this is already in
        // production (the code has likely already done its damage by the time
        // we're seeing it)... but we yell loudly about this so that hopefully it's
        // more likely to be caught in development before making it to production
        if (element.children.length > 0) {
          if (!options.ignoreUnescapedHTML) {
            console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk.");
            console.warn("https://github.com/highlightjs/highlight.js/wiki/security");
            console.warn("The element with unescaped HTML:");
            console.warn(element);
          }
          if (options.throwUnescapedHTML) {
            const err = new HTMLInjectionError(
              "One of your code blocks includes unescaped HTML.",
              element.innerHTML
            );
            throw err;
          }
        }
  
        node = element;
        const text = node.textContent;
        const result = language ? highlight(text, { language, ignoreIllegals: true }) : highlightAuto(text);
  
        element.innerHTML = result.value;
        updateClassName(element, language, result.language);
        element.result = {
          language: result.language,
          // TODO: remove with version 11.0
          re: result.relevance,
          relevance: result.relevance
        };
        if (result.secondBest) {
          element.secondBest = {
            language: result.secondBest.language,
            relevance: result.secondBest.relevance
          };
        }
  
        fire("after:highlightElement", { el: element, result, text });
      }
  
      /**
       * Updates highlight.js global options with the passed options
       *
       * @param {Partial<HLJSOptions>} userOptions
       */
      function configure(userOptions) {
        options = inherit(options, userOptions);
      }
  
      // TODO: remove v12, deprecated
      const initHighlighting = () => {
        highlightAll();
        deprecated("10.6.0", "initHighlighting() deprecated.  Use highlightAll() now.");
      };
  
      // TODO: remove v12, deprecated
      function initHighlightingOnLoad() {
        highlightAll();
        deprecated("10.6.0", "initHighlightingOnLoad() deprecated.  Use highlightAll() now.");
      }
  
      let wantsHighlight = false;
  
      /**
       * auto-highlights all pre>code elements on the page
       */
      function highlightAll() {
        // if we are called too early in the loading process
        if (document.readyState === "loading") {
          wantsHighlight = true;
          return;
        }
  
        const blocks = document.querySelectorAll(options.cssSelector);
        blocks.forEach(highlightElement);
      }
  
      function boot() {
        // if a highlight was requested before DOM was loaded, do now
        if (wantsHighlight) highlightAll();
      }
  
      // make sure we are in the browser environment
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('DOMContentLoaded', boot, false);
      }
  
      /**
       * Register a language grammar module
       *
       * @param {string} languageName
       * @param {LanguageFn} languageDefinition
       */
      function registerLanguage(languageName, languageDefinition) {
        let lang = null;
        try {
          lang = languageDefinition(hljs);
        } catch (error$1) {
          error("Language definition for '{}' could not be registered.".replace("{}", languageName));
          // hard or soft error
          if (!SAFE_MODE) { throw error$1; } else { error(error$1); }
          // languages that have serious errors are replaced with essentially a
          // "plaintext" stand-in so that the code blocks will still get normal
          // css classes applied to them - and one bad language won't break the
          // entire highlighter
          lang = PLAINTEXT_LANGUAGE;
        }
        // give it a temporary name if it doesn't have one in the meta-data
        if (!lang.name) lang.name = languageName;
        languages[languageName] = lang;
        lang.rawDefinition = languageDefinition.bind(null, hljs);
  
        if (lang.aliases) {
          registerAliases(lang.aliases, { languageName });
        }
      }
  
      /**
       * Remove a language grammar module
       *
       * @param {string} languageName
       */
      function unregisterLanguage(languageName) {
        delete languages[languageName];
        for (const alias of Object.keys(aliases)) {
          if (aliases[alias] === languageName) {
            delete aliases[alias];
          }
        }
      }
  
      /**
       * @returns {string[]} List of language internal names
       */
      function listLanguages() {
        return Object.keys(languages);
      }
  
      /**
       * @param {string} name - name of the language to retrieve
       * @returns {Language | undefined}
       */
      function getLanguage(name) {
        name = (name || '').toLowerCase();
        return languages[name] || languages[aliases[name]];
      }
  
      /**
       *
       * @param {string|string[]} aliasList - single alias or list of aliases
       * @param {{languageName: string}} opts
       */
      function registerAliases(aliasList, { languageName }) {
        if (typeof aliasList === 'string') {
          aliasList = [aliasList];
        }
        aliasList.forEach(alias => { aliases[alias.toLowerCase()] = languageName; });
      }
  
      /**
       * Determines if a given language has auto-detection enabled
       * @param {string} name - name of the language
       */
      function autoDetection(name) {
        const lang = getLanguage(name);
        return lang && !lang.disableAutodetect;
      }
  
      /**
       * Upgrades the old highlightBlock plugins to the new
       * highlightElement API
       * @param {HLJSPlugin} plugin
       */
      function upgradePluginAPI(plugin) {
        // TODO: remove with v12
        if (plugin["before:highlightBlock"] && !plugin["before:highlightElement"]) {
          plugin["before:highlightElement"] = (data) => {
            plugin["before:highlightBlock"](
              Object.assign({ block: data.el }, data)
            );
          };
        }
        if (plugin["after:highlightBlock"] && !plugin["after:highlightElement"]) {
          plugin["after:highlightElement"] = (data) => {
            plugin["after:highlightBlock"](
              Object.assign({ block: data.el }, data)
            );
          };
        }
      }
  
      /**
       * @param {HLJSPlugin} plugin
       */
      function addPlugin(plugin) {
        upgradePluginAPI(plugin);
        plugins.push(plugin);
      }
  
      /**
       * @param {HLJSPlugin} plugin
       */
      function removePlugin(plugin) {
        const index = plugins.indexOf(plugin);
        if (index !== -1) {
          plugins.splice(index, 1);
        }
      }
  
      /**
       *
       * @param {PluginEvent} event
       * @param {any} args
       */
      function fire(event, args) {
        const cb = event;
        plugins.forEach(function(plugin) {
          if (plugin[cb]) {
            plugin[cb](args);
          }
        });
      }
  
      /**
       * DEPRECATED
       * @param {HighlightedHTMLElement} el
       */
      function deprecateHighlightBlock(el) {
        deprecated("10.7.0", "highlightBlock will be removed entirely in v12.0");
        deprecated("10.7.0", "Please use highlightElement now.");
  
        return highlightElement(el);
      }
  
      /* Interface definition */
      Object.assign(hljs, {
        highlight,
        highlightAuto,
        highlightAll,
        highlightElement,
        // TODO: Remove with v12 API
        highlightBlock: deprecateHighlightBlock,
        configure,
        initHighlighting,
        initHighlightingOnLoad,
        registerLanguage,
        unregisterLanguage,
        listLanguages,
        getLanguage,
        registerAliases,
        autoDetection,
        inherit,
        addPlugin,
        removePlugin
      });
  
      hljs.debugMode = function() { SAFE_MODE = false; };
      hljs.safeMode = function() { SAFE_MODE = true; };
      hljs.versionString = version;
  
      hljs.regex = {
        concat: concat,
        lookahead: lookahead,
        either: either,
        optional: optional,
        anyNumberOfTimes: anyNumberOfTimes
      };
  
      for (const key in MODES$1) {
        // @ts-ignore
        if (typeof MODES$1[key] === "object") {
          // @ts-ignore
          deepFreeze(MODES$1[key]);
        }
      }
  
      // merge all the modes/regexes into our main object
      Object.assign(hljs, MODES$1);
  
      return hljs;
    };
  
    // Other names for the variable may break build script
    const highlight = HLJS({});
  
    // returns a new instance of the highlighter to be used for extensions
    // check https://github.com/wooorm/lowlight/issues/47
    highlight.newInstance = () => HLJS({});
  
    // export an "instance" of the highlighter
    var HighlightJS = highlight;
  
    /*
    Language: Golo
    Author: Philippe Charriere <ph.charriere@gmail.com>
    Description: a lightweight dynamic language for the JVM
    Website: http://golo-lang.org/
    */
  
    function qlik (hljs) {
      const QVS_KEYWORDS = {
        keyword:
          "Add Alias And As Autogenerate|10 " +
          "Binary Buffer " +
          "Call Case Comment Concatenate Connect Crosstable Custom " +
          "Default Derive Detail Dimension Directory Disconnect Distinct Do " +
          "Each Else Elseif Endif Endsub Endswitch Execute " +
          "First FlushLog For Force From From_Field " +
          "Generic " +
          "Hierarchy|10 HierarchyBelongsTo|10 " +
          "if In Inline Inputfield|10 Intervalmatch|10 Into " +
          "join " +
          "Let Lib Loop Loosen " +
          "Map Measure " +
          "Native Next Noconcatenate|10 Not NullAsNull NullAsValue " +
          "ODBC OLEDB Or " +
          "Qualify " +
          "Replace Resident " +
          "Sample Script Section Select Semantic Set Sleep SQL SQLColumns SQLTables SQLTypes Star Step Store Sub " +
          "Switch " +
          "Then To Trace " +
          "Unless Unmap Unqualify Untag Using " +
          "When Where With",
  
        built_in:
          "Acos Addmonths Addyears Age Alt Applycodepage Applymap Argb Asin Atan Atan2 Attribute Author Autonumber " +
          "Autonumberhash128 Autonumberhash256 Avg " +
          "Bitcount Black Blackandschole Blue Brown " +
          "Capitalize Ceil Chi2test_chi2 Chi2test_df Chi2test_p Chidist Chiinv Chr Class Clientplatform Color " +
          "Colormaphue Colormapjet Colormix1 Colormix2 Combin Computername Concat Connectstring Converttolocaltime " +
          "Correl Cos Cosh Count Cyan " +
          "Darkgray Day Dayend Daylightsaving Dayname Daynumberofquarter Daynumberofyear Daystart Div " +
          "DocumentName DocumentPath DocumentTitle Dual " +
          "E Evaluate Even Exists Exp " +
          "Fabs Fact False Fdist FieldIndex FieldName FieldNumber FieldValue FieldValueCount FileBaseName FileDir " +
          "FileExtension FileList FileName FilePath FileSize FileTime FindOneOf Finv FirstSortedValue FirstValue FirstWorkDate " +
          "Floor Fmod Frac Fractile Fv " +
          "GetExtendedProperty GetFolderPath GetObjectField GetRegistryString GMT Green " +
          "Hash128 Hash160 Hash256 Hour HSL " +
          "InDay InDayToTime Index InLunarWeek InLunarWeekToDate InMonth InMonths InMonthsToDate InMonthToDate " +
          "Input InputAvg InputSum InQuarter InQuarterToDate Interval Interval# InWeek InWeekToDate InYear " +
          "InYearToDate IRR IsNull IsNum IsPartialReload IsText IterNo " +
          "KeepChar Kurtosis " +
          "LastValue LastWorkDate Len LightBlue LightCyan LightGray LightGreen LightMagenta LightRed LINEST_B " +
          "LINEST_DF LINEST_F LINEST_M LINEST_R2 LINEST_SEB LINEST_SEM LINEST_SEY LINEST_SSREG LINEST_SSRESID " +
          "LocalTime log log10 Lookup Lower LTrim LunarWeekEnd LunarWeekName LunarWeekStart " +
          "Magenta MakeDate MakeTime MakeWeekDate MapSubString Match Max MaxString Median Mid Min MinString Minute " +
          "MissingCount MixMatch Mod Mode Money Money# Month MonthEnd MonthName MonthsEnd MonthsName MonthsStart " +
          "MonthStart MsgBox " +
          "NetWorkDays NoOfFields NoOfReports NoOfRows NoOfTables NORMDIST NORMINV Now nPer NPV Null NullCount Num " +
          "Num NumAvg NumCount NumericCount NumMax NumMin NumSum " +
          "Odd Only Ord OSUser " +
          "Peek Permut Pi Pick Pmt pow Previous PurgeChar PV " +
          "QlikTechBlue QlikTechGray QlikViewVersion QuarterEnd QuarterName QuarterStart QvdCreateTime QvdFieldName " +
          "QvdNoOfFields QvdNoOfRecords QvdTableName QVUser " +
          "Rand RangeAvg RangeCorrel RangeCount RangeFractile RangeIRR RangeKurtosis RangeMax RangeMaxString RangeMin " +
          "RangeMinString RangeMissingCount RangeMode RangeNPV RangeNullCount RangeNumericCount RangeOnly RangeSkew " +
          "RangeStdev RangeSum RangeTextCount RangeXIRR RangeXNPV Rate RecNo Red ReloadTime Repeat Replace " +
          "ReportComment ReportId ReportName ReportNumber RGB Round RowNo RTrim " +
          "Second SetDateYear SetDateYearMonth Sign sin sinh Skew sqr sqrt Stdev Sterr STEYX SubField|10 SubStringCount " +
          "Sum SysColor " +
          "TableName TableNumber tan tanh TDIST Text TextBetween TextCount TimeZone " +
          "TINV Today Trim True TTest1_conf TTest1_df TTest1_dif TTest1_lower TTest1_sig TTest1_sterr TTest1_t " +
          "TTest1_upper TTest1w_conf TTest1w_df TTest1w_dif TTest1w_lower TTest1w_sig TTest1w_sterr TTest1w_t " +
          "TTest1w_upper TTest_conf TTest_df TTest_dif TTest_lower TTest_sig TTest_sterr TTest_t TTest_upper " +
          "TTestw_conf TTestw_df TTestw_dif TTestw_lower TTestw_sig TTestw_sterr TTestw_t TTestw_upper " +
          "Upper UTC " +
          "Week WeekDay WeekEnd WeekName WeekStart WeekYear White WildMatch WildMatch5 " +
          "XIRR XNPV " +
          "Year Year2Date YearEnd YearName YearStart YearToDate Yellow " +
          "ZTest_conf ZTest_dif ZTest_lower ZTest_sig ZTest_sterr ZTest_upper ZTest_z ZTestw_conf ZTestw_dif " +
          "ZTestw_lower ZTestw_sig ZTestw_sterr ZTestw_upper ZTestw_z",
      };
      const QVS_KEYWORD_COMBINATIONS = {
        //Deals with the correct highlighting of keywords that are only valid in combinations
        className: "keyword",
        begin:
          "\\b(left\\s+join|right\\s+join|inner\\s+join|outer\\s+join|left\\s+keep|right\\s+keep|\\inner\\s+keep|drop\\s+table|drop\\s+tables|drop\\s+field|drop\\s+fields|exit\\s+script|exit\\s+sub|exit\\s+for|exit\\s+do|exit\\s+switch|rename\\s+table|rename\\s+field|bundle\\s+image_size|tag\\s+field|tag\\s+fields|end\\s+if|end\\s+sub|end\\s+switch|do\\s+while|do\\s+until|loop\\s+while|loop\\s+until|group\\s+by)\\b",
        keywords:
          "left right inner outer join keep drop tag rename table tables field fields exit script sub for do switch image_size group by end if loop while until",
      };
      const QVS_HASH_FUNCTIONS = {
        //Deals with the correct highlighting of the functions that have an interpretation version eg. date() and date#()
        className: "built_in",
        begin: "\\b(date|interval|money|num|time|timestamp)#?\\s*(?=(\\(|$))",
        illegal: "\\n",
      };
      const QVS_KEYWORD_FUNCTIONS = {
        //Deals with the correct highlighting of the functions that have a keyword with the same name eg. if, left, right, etc
        className: "built_in",
        begin: "\\b(if|left|right)\\s*(?=(\\(|$))",
        illegal: "\\n",
      };
      const QVS_STRING_SINGLE = {
        //Gives a string when using single quotes
        className: "string",
        begin: "'",
        end: "'",
        illegal: "\\n",
        relevance: 0,
      };
      const QVS_MUST_INCLUDE = {
        //Gives a string when using single quotes
        className: "property",
        begin: "\\$\\(must_include=\\$",
        end: "\\);",
        illegal: "\\n",
        relevance: 0,
      };
  
      const QVS_STRING_DOUBLE = {
        //Gives a string when using double quotes
        className: "string",
        begin: '"',
        end: '"',
        illegal: "\\n",
        relevance: 0,
      };
      const QVS_REM_COMMENT = {
        //Gives a REM comment. Correctly matches when it is at the start of a line only.
        className: "comment",
        begin: "^\\s*rem\\b",
        end: ";",
        relevance: 10,
      };
      const QVS_variable_DEF = {
        //Gives a variable definition when using SET or LET
        className: "variable",
        begin: "\\b(let|set)\\s+",
        end: "\\w+[\\w.]*",
        keywords: "set let",
        illegal: "\\n",
        relevance: 10,
      };
      const QVS_variable_USE = {
        //Gives a variable when used inside $()
        className: "variable",
        begin: "\\$\\(",
        end: "\\)",
        illegal: "\\n",
        relevance: 10,
      };
      const QVS_BRACED_FIELD = {
        //Gives a field when using square braces []
        className: "field",
        begin: "\\[",
        end: "\\]",
        relevance: 0,
      };
      const QVS_FIELD = {
        className: "field", //Identifies field names within the direct query statement
        begin: "\\b[a-zA-Z_][a-zA-Z0-9_-]*\\b",
        keywords: QVS_KEYWORDS,
        illegal: "\ns",
        contains: [QVS_HASH_FUNCTIONS, QVS_KEYWORD_FUNCTIONS],
      };
  
      return {
        name: "qlik",
        aliases: ["qvs", "qlikview"],
        case_insensitive: true,
        keywords: QVS_KEYWORDS,
        contains: [
          QVS_MUST_INCLUDE,
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          QVS_KEYWORD_COMBINATIONS,
          QVS_HASH_FUNCTIONS,
          QVS_KEYWORD_FUNCTIONS,
          QVS_STRING_SINGLE,
          QVS_STRING_DOUBLE,
          QVS_REM_COMMENT,
          QVS_variable_DEF,
          QVS_variable_USE,
          {
            className: "sql_statement", //Ensures SQL statements are identified to stop other keywords being highlighted within them
            begin: "\\bsql\\b",
            end: ";",
            keywords: "sql",
            contains: [
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE,
              QVS_STRING_SINGLE,
              QVS_STRING_DOUBLE,
              QVS_variable_USE,
            ],
            relevance: 0,
          },
          {
            className: "trace_statement", //Ensures SQL statements are identified to stop other keywords being highlighted within them
            begin: "TRACE ",
            end: ";",
            excludeBegin: true,
            keywords: "trace",
            contains: [
              QVS_STRING_SINGLE,
              QVS_STRING_DOUBLE,
              QVS_variable_USE,
              hljs.C_BLOCK_COMMENT_MODE,
            ],
            relevance: 0,
          },
          {
            className: "direct_query_statement", //Identifies direct query statements
            begin: "\\bdirect\\s+query\\b",
            end: ";",
            keywords: "direct query",
            contains: [
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE,
              QVS_HASH_FUNCTIONS,
              QVS_KEYWORD_FUNCTIONS,
              QVS_STRING_SINGLE,
              QVS_STRING_DOUBLE,
              QVS_variable_USE,
              {
                className: "direct_query_from", //Identifies if the load statement has a source rather than it being a preceding load.
                begin: "\\bfrom\\b",
                end: "(?=(;|$))",
                keywords: QVS_KEYWORDS,
                contains: [
                  hljs.C_LINE_COMMENT_MODE,
                  hljs.C_BLOCK_COMMENT_MODE,
                  QVS_STRING_SINGLE,
                  QVS_STRING_DOUBLE,
                  QVS_variable_USE,
                ],
              },
              QVS_BRACED_FIELD,
              QVS_FIELD,
            ],
            relevance: 10,
          },
          {
            className: "load_statement", //Identifies load statements
            begin:
              "\\b(mapping\\s+load|bundle\\s+info\\s+load|info\\s+load|load)\\b",
            end: ";",
            keywords: "load mapping bundle info as distinct",
            contains: [
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE,
              QVS_HASH_FUNCTIONS,
              QVS_KEYWORD_FUNCTIONS,
              QVS_KEYWORD_COMBINATIONS,
              QVS_STRING_SINGLE,
              QVS_STRING_DOUBLE,
              QVS_variable_USE,
              {
                className: "load_source", //Identifies if the load statement has a source rather than it being a preceding load.
                begin: "\\b(resident|inline|autogenerate|from)\\b",
                end: "(?=(;|$))",
                keywords: QVS_KEYWORDS,
                contains: [
                  hljs.C_LINE_COMMENT_MODE,
                  hljs.C_BLOCK_COMMENT_MODE,
                  QVS_HASH_FUNCTIONS,
                  QVS_KEYWORD_FUNCTIONS,
                  QVS_KEYWORD_COMBINATIONS,
                  QVS_STRING_SINGLE,
                  QVS_STRING_DOUBLE,
                  QVS_variable_USE,
                  {
                    className: "format_specification", //Identifies the format specification contained in braces ()
                    begin: "\\(",
                    end: "\\)",
                    keywords: {
                      format_specification_items:
                        "ansi oem mac UTF-8 Unicode txt fix dif biff ooxml html xml qvd " +
                        "delimiter is no eof embedded labels explicit no table header line lines comment record " +
                        "quotes msq filters",
                    },
                    contains: [
                      hljs.C_LINE_COMMENT_MODE,
                      hljs.C_BLOCK_COMMENT_MODE,
                      QVS_STRING_SINGLE,
                      QVS_STRING_DOUBLE,
                      QVS_variable_USE,
                    ],
                  },
                ],
                relevance: 10,
              },
              QVS_BRACED_FIELD,
              QVS_FIELD,
            ],
            relevance: 10,
          },
        ],
      };
    }
  
    /*
    Language: Python
    Description: Python is an interpreted, object-oriented, high-level programming language with dynamic semantics.
    Website: https://www.python.org
    Category: common
    */
  
    function python(hljs) {
      const regex = hljs.regex;
      const IDENT_RE = /[\p{XID_Start}_]\p{XID_Continue}*/u;
      const RESERVED_WORDS = [
        'and',
        'as',
        'assert',
        'async',
        'await',
        'break',
        'case',
        'class',
        'continue',
        'def',
        'del',
        'elif',
        'else',
        'except',
        'finally',
        'for',
        'from',
        'global',
        'if',
        'import',
        'in',
        'is',
        'lambda',
        'match',
        'nonlocal|10',
        'not',
        'or',
        'pass',
        'raise',
        'return',
        'try',
        'while',
        'with',
        'yield'
      ];
  
      const BUILT_INS = [
        '__import__',
        'abs',
        'all',
        'any',
        'ascii',
        'bin',
        'bool',
        'breakpoint',
        'bytearray',
        'bytes',
        'callable',
        'chr',
        'classmethod',
        'compile',
        'complex',
        'delattr',
        'dict',
        'dir',
        'divmod',
        'enumerate',
        'eval',
        'exec',
        'filter',
        'float',
        'format',
        'frozenset',
        'getattr',
        'globals',
        'hasattr',
        'hash',
        'help',
        'hex',
        'id',
        'input',
        'int',
        'isinstance',
        'issubclass',
        'iter',
        'len',
        'list',
        'locals',
        'map',
        'max',
        'memoryview',
        'min',
        'next',
        'object',
        'oct',
        'open',
        'ord',
        'pow',
        'print',
        'property',
        'range',
        'repr',
        'reversed',
        'round',
        'set',
        'setattr',
        'slice',
        'sorted',
        'staticmethod',
        'str',
        'sum',
        'super',
        'tuple',
        'type',
        'vars',
        'zip'
      ];
  
      const LITERALS = [
        '__debug__',
        'Ellipsis',
        'False',
        'None',
        'NotImplemented',
        'True'
      ];
  
      // https://docs.python.org/3/library/typing.html
      // TODO: Could these be supplemented by a CamelCase matcher in certain
      // contexts, leaving these remaining only for relevance hinting?
      const TYPES = [
        "Any",
        "Callable",
        "Coroutine",
        "Dict",
        "List",
        "Literal",
        "Generic",
        "Optional",
        "Sequence",
        "Set",
        "Tuple",
        "Type",
        "Union"
      ];
  
      const KEYWORDS = {
        $pattern: /[A-Za-z]\w+|__\w+__/,
        keyword: RESERVED_WORDS,
        built_in: BUILT_INS,
        literal: LITERALS,
        type: TYPES
      };
  
      const PROMPT = {
        className: 'meta',
        begin: /^(>>>|\.\.\.) /
      };
  
      const SUBST = {
        className: 'subst',
        begin: /\{/,
        end: /\}/,
        keywords: KEYWORDS,
        illegal: /#/
      };
  
      const LITERAL_BRACKET = {
        begin: /\{\{/,
        relevance: 0
      };
  
      const STRING = {
        className: 'string',
        contains: [ hljs.BACKSLASH_ESCAPE ],
        variants: [
          {
            begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,
            end: /'''/,
            contains: [
              hljs.BACKSLASH_ESCAPE,
              PROMPT
            ],
            relevance: 10
          },
          {
            begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,
            end: /"""/,
            contains: [
              hljs.BACKSLASH_ESCAPE,
              PROMPT
            ],
            relevance: 10
          },
          {
            begin: /([fF][rR]|[rR][fF]|[fF])'''/,
            end: /'''/,
            contains: [
              hljs.BACKSLASH_ESCAPE,
              PROMPT,
              LITERAL_BRACKET,
              SUBST
            ]
          },
          {
            begin: /([fF][rR]|[rR][fF]|[fF])"""/,
            end: /"""/,
            contains: [
              hljs.BACKSLASH_ESCAPE,
              PROMPT,
              LITERAL_BRACKET,
              SUBST
            ]
          },
          {
            begin: /([uU]|[rR])'/,
            end: /'/,
            relevance: 10
          },
          {
            begin: /([uU]|[rR])"/,
            end: /"/,
            relevance: 10
          },
          {
            begin: /([bB]|[bB][rR]|[rR][bB])'/,
            end: /'/
          },
          {
            begin: /([bB]|[bB][rR]|[rR][bB])"/,
            end: /"/
          },
          {
            begin: /([fF][rR]|[rR][fF]|[fF])'/,
            end: /'/,
            contains: [
              hljs.BACKSLASH_ESCAPE,
              LITERAL_BRACKET,
              SUBST
            ]
          },
          {
            begin: /([fF][rR]|[rR][fF]|[fF])"/,
            end: /"/,
            contains: [
              hljs.BACKSLASH_ESCAPE,
              LITERAL_BRACKET,
              SUBST
            ]
          },
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE
        ]
      };
  
      // https://docs.python.org/3.9/reference/lexical_analysis.html#numeric-literals
      const digitpart = '[0-9](_?[0-9])*';
      const pointfloat = `(\\b(${digitpart}))?\\.(${digitpart})|\\b(${digitpart})\\.`;
      // Whitespace after a number (or any lexical token) is needed only if its absence
      // would change the tokenization
      // https://docs.python.org/3.9/reference/lexical_analysis.html#whitespace-between-tokens
      // We deviate slightly, requiring a word boundary or a keyword
      // to avoid accidentally recognizing *prefixes* (e.g., `0` in `0x41` or `08` or `0__1`)
      const lookahead = `\\b|${RESERVED_WORDS.join('|')}`;
      const NUMBER = {
        className: 'number',
        relevance: 0,
        variants: [
          // exponentfloat, pointfloat
          // https://docs.python.org/3.9/reference/lexical_analysis.html#floating-point-literals
          // optionally imaginary
          // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
          // Note: no leading \b because floats can start with a decimal point
          // and we don't want to mishandle e.g. `fn(.5)`,
          // no trailing \b for pointfloat because it can end with a decimal point
          // and we don't want to mishandle e.g. `0..hex()`; this should be safe
          // because both MUST contain a decimal point and so cannot be confused with
          // the interior part of an identifier
          {
            begin: `(\\b(${digitpart})|(${pointfloat}))[eE][+-]?(${digitpart})[jJ]?(?=${lookahead})`
          },
          {
            begin: `(${pointfloat})[jJ]?`
          },
  
          // decinteger, bininteger, octinteger, hexinteger
          // https://docs.python.org/3.9/reference/lexical_analysis.html#integer-literals
          // optionally "long" in Python 2
          // https://docs.python.org/2.7/reference/lexical_analysis.html#integer-and-long-integer-literals
          // decinteger is optionally imaginary
          // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
          {
            begin: `\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${lookahead})`
          },
          {
            begin: `\\b0[bB](_?[01])+[lL]?(?=${lookahead})`
          },
          {
            begin: `\\b0[oO](_?[0-7])+[lL]?(?=${lookahead})`
          },
          {
            begin: `\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${lookahead})`
          },
  
          // imagnumber (digitpart-based)
          // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
          {
            begin: `\\b(${digitpart})[jJ](?=${lookahead})`
          }
        ]
      };
      const COMMENT_TYPE = {
        className: "comment",
        begin: regex.lookahead(/# type:/),
        end: /$/,
        keywords: KEYWORDS,
        contains: [
          { // prevent keywords from coloring `type`
            begin: /# type:/
          },
          // comment within a datatype comment includes no keywords
          {
            begin: /#/,
            end: /\b\B/,
            endsWithParent: true
          }
        ]
      };
      const PARAMS = {
        className: 'params',
        variants: [
          // Exclude params in functions without params
          {
            className: "",
            begin: /\(\s*\)/,
            skip: true
          },
          {
            begin: /\(/,
            end: /\)/,
            excludeBegin: true,
            excludeEnd: true,
            keywords: KEYWORDS,
            contains: [
              'self',
              PROMPT,
              NUMBER,
              STRING,
              hljs.HASH_COMMENT_MODE
            ]
          }
        ]
      };
      SUBST.contains = [
        STRING,
        NUMBER,
        PROMPT
      ];
  
      return {
        name: 'Python',
        aliases: [
          'py',
          'gyp',
          'ipython'
        ],
        unicodeRegex: true,
        keywords: KEYWORDS,
        illegal: /(<\/|\?)|=>/,
        contains: [
          PROMPT,
          NUMBER,
          {
            // very common convention
            begin: /\bself\b/
          },
          {
            // eat "if" prior to string so that it won't accidentally be
            // labeled as an f-string
            beginKeywords: "if",
            relevance: 0
          },
          STRING,
          COMMENT_TYPE,
          hljs.HASH_COMMENT_MODE,
          {
            match: [
              /\bdef/, /\s+/,
              IDENT_RE,
            ],
            scope: {
              1: "keyword",
              3: "title.function"
            },
            contains: [ PARAMS ]
          },
          {
            variants: [
              {
                match: [
                  /\bclass/, /\s+/,
                  IDENT_RE, /\s*/,
                  /\(\s*/, IDENT_RE,/\s*\)/
                ],
              },
              {
                match: [
                  /\bclass/, /\s+/,
                  IDENT_RE
                ],
              }
            ],
            scope: {
              1: "keyword",
              3: "title.class",
              6: "title.class.inherited",
            }
          },
          {
            className: 'meta',
            begin: /^[\t ]*@/,
            end: /(?=#)|$/,
            contains: [
              NUMBER,
              PARAMS,
              STRING
            ]
          }
        ]
      };
    }
  
    /*
    Language: R
    Description: R is a free software environment for statistical computing and graphics.
    Author: Joe Cheng <joe@rstudio.org>
    Contributors: Konrad Rudolph <konrad.rudolph@gmail.com>
    Website: https://www.r-project.org
    Category: common,scientific
    */
  
    /** @type LanguageFn */
    function r(hljs) {
      const regex = hljs.regex;
      // Identifiers in R cannot start with `_`, but they can start with `.` if it
      // is not immediately followed by a digit.
      // R also supports quoted identifiers, which are near-arbitrary sequences
      // delimited by backticks (`…`), which may contain escape sequences. These are
      // handled in a separate mode. See `test/markup/r/names.txt` for examples.
      // FIXME: Support Unicode identifiers.
      const IDENT_RE = /(?:(?:[a-zA-Z]|\.[._a-zA-Z])[._a-zA-Z0-9]*)|\.(?!\d)/;
      const NUMBER_TYPES_RE = regex.either(
        // Special case: only hexadecimal binary powers can contain fractions
        /0[xX][0-9a-fA-F]+\.[0-9a-fA-F]*[pP][+-]?\d+i?/,
        // Hexadecimal numbers without fraction and optional binary power
        /0[xX][0-9a-fA-F]+(?:[pP][+-]?\d+)?[Li]?/,
        // Decimal numbers
        /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[Li]?/
      );
      const OPERATORS_RE = /[=!<>:]=|\|\||&&|:::?|<-|<<-|->>|->|\|>|[-+*\/?!$&|:<=>@^~]|\*\*/;
      const PUNCTUATION_RE = regex.either(
        /[()]/,
        /[{}]/,
        /\[\[/,
        /[[\]]/,
        /\\/,
        /,/
      );
  
      return {
        name: 'R',
  
        keywords: {
          $pattern: IDENT_RE,
          keyword:
            'function if in break next repeat else for while',
          literal:
            'NULL NA TRUE FALSE Inf NaN NA_integer_|10 NA_real_|10 '
            + 'NA_character_|10 NA_complex_|10',
          built_in:
            // Builtin constants
            'LETTERS letters month.abb month.name pi T F '
            // Primitive functions
            // These are all the functions in `base` that are implemented as a
            // `.Primitive`, minus those functions that are also keywords.
            + 'abs acos acosh all any anyNA Arg as.call as.character '
            + 'as.complex as.double as.environment as.integer as.logical '
            + 'as.null.default as.numeric as.raw asin asinh atan atanh attr '
            + 'attributes baseenv browser c call ceiling class Conj cos cosh '
            + 'cospi cummax cummin cumprod cumsum digamma dim dimnames '
            + 'emptyenv exp expression floor forceAndCall gamma gc.time '
            + 'globalenv Im interactive invisible is.array is.atomic is.call '
            + 'is.character is.complex is.double is.environment is.expression '
            + 'is.finite is.function is.infinite is.integer is.language '
            + 'is.list is.logical is.matrix is.na is.name is.nan is.null '
            + 'is.numeric is.object is.pairlist is.raw is.recursive is.single '
            + 'is.symbol lazyLoadDBfetch length lgamma list log max min '
            + 'missing Mod names nargs nzchar oldClass on.exit pos.to.env '
            + 'proc.time prod quote range Re rep retracemem return round '
            + 'seq_along seq_len seq.int sign signif sin sinh sinpi sqrt '
            + 'standardGeneric substitute sum switch tan tanh tanpi tracemem '
            + 'trigamma trunc unclass untracemem UseMethod xtfrm',
        },
  
        contains: [
          // Roxygen comments
          hljs.COMMENT(
            /#'/,
            /$/,
            { contains: [
              {
                // Handle `@examples` separately to cause all subsequent code
                // until the next `@`-tag on its own line to be kept as-is,
                // preventing highlighting. This code is example R code, so nested
                // doctags shouldn’t be treated as such. See
                // `test/markup/r/roxygen.txt` for an example.
                scope: 'doctag',
                match: /@examples/,
                starts: {
                  end: regex.lookahead(regex.either(
                    // end if another doc comment
                    /\n^#'\s*(?=@[a-zA-Z]+)/,
                    // or a line with no comment
                    /\n^(?!#')/
                  )),
                  endsParent: true
                }
              },
              {
                // Handle `@param` to highlight the parameter name following
                // after.
                scope: 'doctag',
                begin: '@param',
                end: /$/,
                contains: [
                  {
                    scope: 'variable',
                    variants: [
                      { match: IDENT_RE },
                      { match: /`(?:\\.|[^`\\])+`/ }
                    ],
                    endsParent: true
                  }
                ]
              },
              {
                scope: 'doctag',
                match: /@[a-zA-Z]+/
              },
              {
                scope: 'keyword',
                match: /\\[a-zA-Z]+/
              }
            ] }
          ),
  
          hljs.HASH_COMMENT_MODE,
  
          {
            scope: 'string',
            contains: [ hljs.BACKSLASH_ESCAPE ],
            variants: [
              hljs.END_SAME_AS_BEGIN({
                begin: /[rR]"(-*)\(/,
                end: /\)(-*)"/
              }),
              hljs.END_SAME_AS_BEGIN({
                begin: /[rR]"(-*)\{/,
                end: /\}(-*)"/
              }),
              hljs.END_SAME_AS_BEGIN({
                begin: /[rR]"(-*)\[/,
                end: /\](-*)"/
              }),
              hljs.END_SAME_AS_BEGIN({
                begin: /[rR]'(-*)\(/,
                end: /\)(-*)'/
              }),
              hljs.END_SAME_AS_BEGIN({
                begin: /[rR]'(-*)\{/,
                end: /\}(-*)'/
              }),
              hljs.END_SAME_AS_BEGIN({
                begin: /[rR]'(-*)\[/,
                end: /\](-*)'/
              }),
              {
                begin: '"',
                end: '"',
                relevance: 0
              },
              {
                begin: "'",
                end: "'",
                relevance: 0
              }
            ],
          },
  
          // Matching numbers immediately following punctuation and operators is
          // tricky since we need to look at the character ahead of a number to
          // ensure the number is not part of an identifier, and we cannot use
          // negative look-behind assertions. So instead we explicitly handle all
          // possible combinations of (operator|punctuation), number.
          // TODO: replace with negative look-behind when available
          // { begin: /(?<![a-zA-Z0-9._])0[xX][0-9a-fA-F]+\.[0-9a-fA-F]*[pP][+-]?\d+i?/ },
          // { begin: /(?<![a-zA-Z0-9._])0[xX][0-9a-fA-F]+([pP][+-]?\d+)?[Li]?/ },
          // { begin: /(?<![a-zA-Z0-9._])(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?[Li]?/ }
          {
            relevance: 0,
            variants: [
              {
                scope: {
                  1: 'operator',
                  2: 'number'
                },
                match: [
                  OPERATORS_RE,
                  NUMBER_TYPES_RE
                ]
              },
              {
                scope: {
                  1: 'operator',
                  2: 'number'
                },
                match: [
                  /%[^%]*%/,
                  NUMBER_TYPES_RE
                ]
              },
              {
                scope: {
                  1: 'punctuation',
                  2: 'number'
                },
                match: [
                  PUNCTUATION_RE,
                  NUMBER_TYPES_RE
                ]
              },
              {
                scope: { 2: 'number' },
                match: [
                  /[^a-zA-Z0-9._]|^/, // not part of an identifier, or start of document
                  NUMBER_TYPES_RE
                ]
              }
            ]
          },
  
          // Operators/punctuation when they're not directly followed by numbers
          {
            // Relevance boost for the most common assignment form.
            scope: { 3: 'operator' },
            match: [
              IDENT_RE,
              /\s+/,
              /<-/,
              /\s+/
            ]
          },
  
          {
            scope: 'operator',
            relevance: 0,
            variants: [
              { match: OPERATORS_RE },
              { match: /%[^%]*%/ }
            ]
          },
  
          {
            scope: 'punctuation',
            relevance: 0,
            match: PUNCTUATION_RE
          },
  
          {
            // Escaped identifier
            begin: '`',
            end: '`',
            contains: [ { begin: /\\./ } ]
          }
        ]
      };
    }
  
    const IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
    const KEYWORDS = [
      "as", // for exports
      "in",
      "of",
      "if",
      "for",
      "while",
      "finally",
      "var",
      "new",
      "function",
      "do",
      "return",
      "void",
      "else",
      "break",
      "catch",
      "instanceof",
      "with",
      "throw",
      "case",
      "default",
      "try",
      "switch",
      "continue",
      "typeof",
      "delete",
      "let",
      "yield",
      "const",
      "class",
      // JS handles these with a special rule
      // "get",
      // "set",
      "debugger",
      "async",
      "await",
      "static",
      "import",
      "from",
      "export",
      "extends"
    ];
    const LITERALS = [
      "true",
      "false",
      "null",
      "undefined",
      "NaN",
      "Infinity"
    ];
  
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
    const TYPES = [
      // Fundamental objects
      "Object",
      "Function",
      "Boolean",
      "Symbol",
      // numbers and dates
      "Math",
      "Date",
      "Number",
      "BigInt",
      // text
      "String",
      "RegExp",
      // Indexed collections
      "Array",
      "Float32Array",
      "Float64Array",
      "Int8Array",
      "Uint8Array",
      "Uint8ClampedArray",
      "Int16Array",
      "Int32Array",
      "Uint16Array",
      "Uint32Array",
      "BigInt64Array",
      "BigUint64Array",
      // Keyed collections
      "Set",
      "Map",
      "WeakSet",
      "WeakMap",
      // Structured data
      "ArrayBuffer",
      "SharedArrayBuffer",
      "Atomics",
      "DataView",
      "JSON",
      // Control abstraction objects
      "Promise",
      "Generator",
      "GeneratorFunction",
      "AsyncFunction",
      // Reflection
      "Reflect",
      "Proxy",
      // Internationalization
      "Intl",
      // WebAssembly
      "WebAssembly"
    ];
  
    const ERROR_TYPES = [
      "Error",
      "EvalError",
      "InternalError",
      "RangeError",
      "ReferenceError",
      "SyntaxError",
      "TypeError",
      "URIError"
    ];
  
    const BUILT_IN_GLOBALS = [
      "setInterval",
      "setTimeout",
      "clearInterval",
      "clearTimeout",
  
      "require",
      "exports",
  
      "eval",
      "isFinite",
      "isNaN",
      "parseFloat",
      "parseInt",
      "decodeURI",
      "decodeURIComponent",
      "encodeURI",
      "encodeURIComponent",
      "escape",
      "unescape"
    ];
  
    const BUILT_IN_VARIABLES = [
      "arguments",
      "this",
      "super",
      "console",
      "window",
      "document",
      "localStorage",
      "sessionStorage",
      "module",
      "global" // Node.js
    ];
  
    const BUILT_INS = [].concat(
      BUILT_IN_GLOBALS,
      TYPES,
      ERROR_TYPES
    );
  
    /*
    Language: JavaScript
    Description: JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions.
    Category: common, scripting, web
    Website: https://developer.mozilla.org/en-US/docs/Web/JavaScript
    */
  
    /** @type LanguageFn */
    function javascript(hljs) {
      const regex = hljs.regex;
      /**
       * Takes a string like "<Booger" and checks to see
       * if we can find a matching "</Booger" later in the
       * content.
       * @param {RegExpMatchArray} match
       * @param {{after:number}} param1
       */
      const hasClosingTag = (match, { after }) => {
        const tag = "</" + match[0].slice(1);
        const pos = match.input.indexOf(tag, after);
        return pos !== -1;
      };
  
      const IDENT_RE$1 = IDENT_RE;
      const FRAGMENT = {
        begin: '<>',
        end: '</>'
      };
      // to avoid some special cases inside isTrulyOpeningTag
      const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
      const XML_TAG = {
        begin: /<[A-Za-z0-9\\._:-]+/,
        end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
        /**
         * @param {RegExpMatchArray} match
         * @param {CallbackResponse} response
         */
        isTrulyOpeningTag: (match, response) => {
          const afterMatchIndex = match[0].length + match.index;
          const nextChar = match.input[afterMatchIndex];
          if (
            // HTML should not include another raw `<` inside a tag
            // nested type?
            // `<Array<Array<number>>`, etc.
            nextChar === "<" ||
            // the , gives away that this is not HTML
            // `<T, A extends keyof T, V>`
            nextChar === ","
            ) {
            response.ignoreMatch();
            return;
          }
  
          // `<something>`
          // Quite possibly a tag, lets look for a matching closing tag...
          if (nextChar === ">") {
            // if we cannot find a matching closing tag, then we
            // will ignore it
            if (!hasClosingTag(match, { after: afterMatchIndex })) {
              response.ignoreMatch();
            }
          }
  
          // `<blah />` (self-closing)
          // handled by simpleSelfClosing rule
  
          let m;
          const afterMatch = match.input.substring(afterMatchIndex);
  
          // some more template typing stuff
          //  <T = any>(key?: string) => Modify<
          if ((m = afterMatch.match(/^\s*=/))) {
            response.ignoreMatch();
            return;
          }
  
          // `<From extends string>`
          // technically this could be HTML, but it smells like a type
          // NOTE: This is ugh, but added specifically for https://github.com/highlightjs/highlight.js/issues/3276
          if ((m = afterMatch.match(/^\s+extends\s+/))) {
            if (m.index === 0) {
              response.ignoreMatch();
              // eslint-disable-next-line no-useless-return
              return;
            }
          }
        }
      };
      const KEYWORDS$1 = {
        $pattern: IDENT_RE,
        keyword: KEYWORDS,
        literal: LITERALS,
        built_in: BUILT_INS,
        "variable.language": BUILT_IN_VARIABLES
      };
  
      // https://tc39.es/ecma262/#sec-literals-numeric-literals
      const decimalDigits = '[0-9](_?[0-9])*';
      const frac = `\\.(${decimalDigits})`;
      // DecimalIntegerLiteral, including Annex B NonOctalDecimalIntegerLiteral
      // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
      const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
      const NUMBER = {
        className: 'number',
        variants: [
          // DecimalLiteral
          { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))` +
            `[eE][+-]?(${decimalDigits})\\b` },
          { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },
  
          // DecimalBigIntegerLiteral
          { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },
  
          // NonDecimalIntegerLiteral
          { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
          { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
          { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },
  
          // LegacyOctalIntegerLiteral (does not include underscore separators)
          // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
          { begin: "\\b0[0-7]+n?\\b" },
        ],
        relevance: 0
      };
  
      const SUBST = {
        className: 'subst',
        begin: '\\$\\{',
        end: '\\}',
        keywords: KEYWORDS$1,
        contains: [] // defined later
      };
      const HTML_TEMPLATE = {
        begin: 'html`',
        end: '',
        starts: {
          end: '`',
          returnEnd: false,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            SUBST
          ],
          subLanguage: 'xml'
        }
      };
      const CSS_TEMPLATE = {
        begin: 'css`',
        end: '',
        starts: {
          end: '`',
          returnEnd: false,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            SUBST
          ],
          subLanguage: 'css'
        }
      };
      const GRAPHQL_TEMPLATE = {
        begin: 'gql`',
        end: '',
        starts: {
          end: '`',
          returnEnd: false,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            SUBST
          ],
          subLanguage: 'graphql'
        }
      };
      const TEMPLATE_STRING = {
        className: 'string',
        begin: '`',
        end: '`',
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ]
      };
      const JSDOC_COMMENT = hljs.COMMENT(
        /\/\*\*(?!\/)/,
        '\\*/',
        {
          relevance: 0,
          contains: [
            {
              begin: '(?=@[A-Za-z]+)',
              relevance: 0,
              contains: [
                {
                  className: 'doctag',
                  begin: '@[A-Za-z]+'
                },
                {
                  className: 'type',
                  begin: '\\{',
                  end: '\\}',
                  excludeEnd: true,
                  excludeBegin: true,
                  relevance: 0
                },
                {
                  className: 'variable',
                  begin: IDENT_RE$1 + '(?=\\s*(-)|$)',
                  endsParent: true,
                  relevance: 0
                },
                // eat spaces (not newlines) so we can find
                // types or variables
                {
                  begin: /(?=[^\n])\s/,
                  relevance: 0
                }
              ]
            }
          ]
        }
      );
      const COMMENT = {
        className: "comment",
        variants: [
          JSDOC_COMMENT,
          hljs.C_BLOCK_COMMENT_MODE,
          hljs.C_LINE_COMMENT_MODE
        ]
      };
      const SUBST_INTERNALS = [
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        HTML_TEMPLATE,
        CSS_TEMPLATE,
        GRAPHQL_TEMPLATE,
        TEMPLATE_STRING,
        // Skip numbers when they are part of a variable name
        { match: /\$\d+/ },
        NUMBER,
        // This is intentional:
        // See https://github.com/highlightjs/highlight.js/issues/3288
        // hljs.REGEXP_MODE
      ];
      SUBST.contains = SUBST_INTERNALS
        .concat({
          // we need to pair up {} inside our subst to prevent
          // it from ending too early by matching another }
          begin: /\{/,
          end: /\}/,
          keywords: KEYWORDS$1,
          contains: [
            "self"
          ].concat(SUBST_INTERNALS)
        });
      const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
      const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
        // eat recursive parens in sub expressions
        {
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS$1,
          contains: ["self"].concat(SUBST_AND_COMMENTS)
        }
      ]);
      const PARAMS = {
        className: 'params',
        begin: /\(/,
        end: /\)/,
        excludeBegin: true,
        excludeEnd: true,
        keywords: KEYWORDS$1,
        contains: PARAMS_CONTAINS
      };
  
      // ES6 classes
      const CLASS_OR_EXTENDS = {
        variants: [
          // class Car extends vehicle
          {
            match: [
              /class/,
              /\s+/,
              IDENT_RE$1,
              /\s+/,
              /extends/,
              /\s+/,
              regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
            ],
            scope: {
              1: "keyword",
              3: "title.class",
              5: "keyword",
              7: "title.class.inherited"
            }
          },
          // class Car
          {
            match: [
              /class/,
              /\s+/,
              IDENT_RE$1
            ],
            scope: {
              1: "keyword",
              3: "title.class"
            }
          },
  
        ]
      };
  
      const CLASS_REFERENCE = {
        relevance: 0,
        match:
        regex.either(
          // Hard coded exceptions
          /\bJSON/,
          // Float32Array, OutT
          /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
          // CSSFactory, CSSFactoryT
          /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
          // FPs, FPsT
          /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/,
          // P
          // single letters are not highlighted
          // BLAH
          // this will be flagged as a UPPER_CASE_CONSTANT instead
        ),
        className: "title.class",
        keywords: {
          _: [
            // se we still get relevance credit for JS library classes
            ...TYPES,
            ...ERROR_TYPES
          ]
        }
      };
  
      const USE_STRICT = {
        label: "use_strict",
        className: 'meta',
        relevance: 10,
        begin: /^\s*['"]use (strict|asm)['"]/
      };
  
      const FUNCTION_DEFINITION = {
        variants: [
          {
            match: [
              /function/,
              /\s+/,
              IDENT_RE$1,
              /(?=\s*\()/
            ]
          },
          // anonymous function
          {
            match: [
              /function/,
              /\s*(?=\()/
            ]
          }
        ],
        className: {
          1: "keyword",
          3: "title.function"
        },
        label: "func.def",
        contains: [ PARAMS ],
        illegal: /%/
      };
  
      const UPPER_CASE_CONSTANT = {
        relevance: 0,
        match: /\b[A-Z][A-Z_0-9]+\b/,
        className: "variable.constant"
      };
  
      function noneOf(list) {
        return regex.concat("(?!", list.join("|"), ")");
      }
  
      const FUNCTION_CALL = {
        match: regex.concat(
          /\b/,
          noneOf([
            ...BUILT_IN_GLOBALS,
            "super",
            "import"
          ]),
          IDENT_RE$1, regex.lookahead(/\(/)),
        className: "title.function",
        relevance: 0
      };
  
      const PROPERTY_ACCESS = {
        begin: regex.concat(/\./, regex.lookahead(
          regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
        )),
        end: IDENT_RE$1,
        excludeBegin: true,
        keywords: "prototype",
        className: "property",
        relevance: 0
      };
  
      const GETTER_OR_SETTER = {
        match: [
          /get|set/,
          /\s+/,
          IDENT_RE$1,
          /(?=\()/
        ],
        className: {
          1: "keyword",
          3: "title.function"
        },
        contains: [
          { // eat to avoid empty params
            begin: /\(\)/
          },
          PARAMS
        ]
      };
  
      const FUNC_LEAD_IN_RE = '(\\(' +
        '[^()]*(\\(' +
        '[^()]*(\\(' +
        '[^()]*' +
        '\\)[^()]*)*' +
        '\\)[^()]*)*' +
        '\\)|' + hljs.UNDERSCORE_IDENT_RE + ')\\s*=>';
  
      const FUNCTION_VARIABLE = {
        match: [
          /const|var|let/, /\s+/,
          IDENT_RE$1, /\s*/,
          /=\s*/,
          /(async\s*)?/, // async is optional
          regex.lookahead(FUNC_LEAD_IN_RE)
        ],
        keywords: "async",
        className: {
          1: "keyword",
          3: "title.function"
        },
        contains: [
          PARAMS
        ]
      };
  
      return {
        name: 'JavaScript',
        aliases: ['js', 'jsx', 'mjs', 'cjs'],
        keywords: KEYWORDS$1,
        // this will be extended by TypeScript
        exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
        illegal: /#(?![$_A-z])/,
        contains: [
          hljs.SHEBANG({
            label: "shebang",
            binary: "node",
            relevance: 5
          }),
          USE_STRICT,
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
          HTML_TEMPLATE,
          CSS_TEMPLATE,
          GRAPHQL_TEMPLATE,
          TEMPLATE_STRING,
          COMMENT,
          // Skip numbers when they are part of a variable name
          { match: /\$\d+/ },
          NUMBER,
          CLASS_REFERENCE,
          {
            className: 'attr',
            begin: IDENT_RE$1 + regex.lookahead(':'),
            relevance: 0
          },
          FUNCTION_VARIABLE,
          { // "value" container
            begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
            keywords: 'return throw case',
            relevance: 0,
            contains: [
              COMMENT,
              hljs.REGEXP_MODE,
              {
                className: 'function',
                // we have to count the parens to make sure we actually have the
                // correct bounding ( ) before the =>.  There could be any number of
                // sub-expressions inside also surrounded by parens.
                begin: FUNC_LEAD_IN_RE,
                returnBegin: true,
                end: '\\s*=>',
                contains: [
                  {
                    className: 'params',
                    variants: [
                      {
                        begin: hljs.UNDERSCORE_IDENT_RE,
                        relevance: 0
                      },
                      {
                        className: null,
                        begin: /\(\s*\)/,
                        skip: true
                      },
                      {
                        begin: /\(/,
                        end: /\)/,
                        excludeBegin: true,
                        excludeEnd: true,
                        keywords: KEYWORDS$1,
                        contains: PARAMS_CONTAINS
                      }
                    ]
                  }
                ]
              },
              { // could be a comma delimited list of params to a function call
                begin: /,/,
                relevance: 0
              },
              {
                match: /\s+/,
                relevance: 0
              },
              { // JSX
                variants: [
                  { begin: FRAGMENT.begin, end: FRAGMENT.end },
                  { match: XML_SELF_CLOSING },
                  {
                    begin: XML_TAG.begin,
                    // we carefully check the opening tag to see if it truly
                    // is a tag and not a false positive
                    'on:begin': XML_TAG.isTrulyOpeningTag,
                    end: XML_TAG.end
                  }
                ],
                subLanguage: 'xml',
                contains: [
                  {
                    begin: XML_TAG.begin,
                    end: XML_TAG.end,
                    skip: true,
                    contains: ['self']
                  }
                ]
              }
            ],
          },
          FUNCTION_DEFINITION,
          {
            // prevent this from getting swallowed up by function
            // since they appear "function like"
            beginKeywords: "while if switch catch for"
          },
          {
            // we have to count the parens to make sure we actually have the correct
            // bounding ( ).  There could be any number of sub-expressions inside
            // also surrounded by parens.
            begin: '\\b(?!function)' + hljs.UNDERSCORE_IDENT_RE +
              '\\(' + // first parens
              '[^()]*(\\(' +
                '[^()]*(\\(' +
                  '[^()]*' +
                '\\)[^()]*)*' +
              '\\)[^()]*)*' +
              '\\)\\s*\\{', // end parens
            returnBegin:true,
            label: "func.def",
            contains: [
              PARAMS,
              hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
            ]
          },
          // catch ... so it won't trigger the property rule below
          {
            match: /\.\.\./,
            relevance: 0
          },
          PROPERTY_ACCESS,
          // hack: prevents detection of keywords in some circumstances
          // .keyword()
          // $keyword = x
          {
            match: '\\$' + IDENT_RE$1,
            relevance: 0
          },
          {
            match: [ /\bconstructor(?=\s*\()/ ],
            className: { 1: "title.function" },
            contains: [ PARAMS ]
          },
          FUNCTION_CALL,
          UPPER_CASE_CONSTANT,
          CLASS_OR_EXTENDS,
          GETTER_OR_SETTER,
          {
            match: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
          }
        ]
      };
    }
  
    /*
    Language: JSON
    Description: JSON (JavaScript Object Notation) is a lightweight data-interchange format.
    Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
    Website: http://www.json.org
    Category: common, protocols, web
    */
  
    function json(hljs) {
      const ATTRIBUTE = {
        className: 'attr',
        begin: /"(\\.|[^\\"\r\n])*"(?=\s*:)/,
        relevance: 1.01
      };
      const PUNCTUATION = {
        match: /[{}[\],:]/,
        className: "punctuation",
        relevance: 0
      };
      const LITERALS = [
        "true",
        "false",
        "null"
      ];
      // NOTE: normally we would rely on `keywords` for this but using a mode here allows us
      // - to use the very tight `illegal: \S` rule later to flag any other character
      // - as illegal indicating that despite looking like JSON we do not truly have
      // - JSON and thus improve false-positively greatly since JSON will try and claim
      // - all sorts of JSON looking stuff
      const LITERALS_MODE = {
        scope: "literal",
        beginKeywords: LITERALS.join(" "),
      };
  
      return {
        name: 'JSON',
        keywords:{
          literal: LITERALS,
        },
        contains: [
          ATTRIBUTE,
          PUNCTUATION,
          hljs.QUOTE_STRING_MODE,
          LITERALS_MODE,
          hljs.C_NUMBER_MODE,
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ],
        illegal: '\\S'
      };
    }
  
    /*
    Language: HTML, XML
    Website: https://www.w3.org/XML/
    Category: common, web
    Audit: 2020
    */
  
    /** @type LanguageFn */
    function xml(hljs) {
      const regex = hljs.regex;
      // XML names can have the following additional letters: https://www.w3.org/TR/xml/#NT-NameChar
      // OTHER_NAME_CHARS = /[:\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]/;
      // Element names start with NAME_START_CHAR followed by optional other Unicode letters, ASCII digits, hyphens, underscores, and periods
      // const TAG_NAME_RE = regex.concat(/[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/, regex.optional(/[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*:/), /[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*/);;
      // const XML_IDENT_RE = /[A-Z_a-z:\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]+/;
      // const TAG_NAME_RE = regex.concat(/[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/, regex.optional(/[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*:/), /[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*/);
      // however, to cater for performance and more Unicode support rely simply on the Unicode letter class
      const TAG_NAME_RE = regex.concat(/[\p{L}_]/u, regex.optional(/[\p{L}0-9_.-]*:/u), /[\p{L}0-9_.-]*/u);
      const XML_IDENT_RE = /[\p{L}0-9._:-]+/u;
      const XML_ENTITIES = {
        className: 'symbol',
        begin: /&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/
      };
      const XML_META_KEYWORDS = {
        begin: /\s/,
        contains: [
          {
            className: 'keyword',
            begin: /#?[a-z_][a-z1-9_-]+/,
            illegal: /\n/
          }
        ]
      };
      const XML_META_PAR_KEYWORDS = hljs.inherit(XML_META_KEYWORDS, {
        begin: /\(/,
        end: /\)/
      });
      const APOS_META_STRING_MODE = hljs.inherit(hljs.APOS_STRING_MODE, { className: 'string' });
      const QUOTE_META_STRING_MODE = hljs.inherit(hljs.QUOTE_STRING_MODE, { className: 'string' });
      const TAG_INTERNALS = {
        endsWithParent: true,
        illegal: /</,
        relevance: 0,
        contains: [
          {
            className: 'attr',
            begin: XML_IDENT_RE,
            relevance: 0
          },
          {
            begin: /=\s*/,
            relevance: 0,
            contains: [
              {
                className: 'string',
                endsParent: true,
                variants: [
                  {
                    begin: /"/,
                    end: /"/,
                    contains: [ XML_ENTITIES ]
                  },
                  {
                    begin: /'/,
                    end: /'/,
                    contains: [ XML_ENTITIES ]
                  },
                  { begin: /[^\s"'=<>`]+/ }
                ]
              }
            ]
          }
        ]
      };
      return {
        name: 'HTML, XML',
        aliases: [
          'html',
          'xhtml',
          'rss',
          'atom',
          'xjb',
          'xsd',
          'xsl',
          'plist',
          'wsf',
          'svg'
        ],
        case_insensitive: true,
        unicodeRegex: true,
        contains: [
          {
            className: 'meta',
            begin: /<![a-z]/,
            end: />/,
            relevance: 10,
            contains: [
              XML_META_KEYWORDS,
              QUOTE_META_STRING_MODE,
              APOS_META_STRING_MODE,
              XML_META_PAR_KEYWORDS,
              {
                begin: /\[/,
                end: /\]/,
                contains: [
                  {
                    className: 'meta',
                    begin: /<![a-z]/,
                    end: />/,
                    contains: [
                      XML_META_KEYWORDS,
                      XML_META_PAR_KEYWORDS,
                      QUOTE_META_STRING_MODE,
                      APOS_META_STRING_MODE
                    ]
                  }
                ]
              }
            ]
          },
          hljs.COMMENT(
            /<!--/,
            /-->/,
            { relevance: 10 }
          ),
          {
            begin: /<!\[CDATA\[/,
            end: /\]\]>/,
            relevance: 10
          },
          XML_ENTITIES,
          // xml processing instructions
          {
            className: 'meta',
            end: /\?>/,
            variants: [
              {
                begin: /<\?xml/,
                relevance: 10,
                contains: [
                  QUOTE_META_STRING_MODE
                ]
              },
              {
                begin: /<\?[a-z][a-z0-9]+/,
              }
            ]
  
          },
          {
            className: 'tag',
            /*
            The lookahead pattern (?=...) ensures that 'begin' only matches
            '<style' as a single word, followed by a whitespace or an
            ending bracket.
            */
            begin: /<style(?=\s|>)/,
            end: />/,
            keywords: { name: 'style' },
            contains: [ TAG_INTERNALS ],
            starts: {
              end: /<\/style>/,
              returnEnd: true,
              subLanguage: [
                'css',
                'xml'
              ]
            }
          },
          {
            className: 'tag',
            // See the comment in the <style tag about the lookahead pattern
            begin: /<script(?=\s|>)/,
            end: />/,
            keywords: { name: 'script' },
            contains: [ TAG_INTERNALS ],
            starts: {
              end: /<\/script>/,
              returnEnd: true,
              subLanguage: [
                'javascript',
                'handlebars',
                'xml'
              ]
            }
          },
          // we need this for now for jSX
          {
            className: 'tag',
            begin: /<>|<\/>/
          },
          // open tag
          {
            className: 'tag',
            begin: regex.concat(
              /</,
              regex.lookahead(regex.concat(
                TAG_NAME_RE,
                // <tag/>
                // <tag>
                // <tag ...
                regex.either(/\/>/, />/, /\s/)
              ))
            ),
            end: /\/?>/,
            contains: [
              {
                className: 'name',
                begin: TAG_NAME_RE,
                relevance: 0,
                starts: TAG_INTERNALS
              }
            ]
          },
          // close tag
          {
            className: 'tag',
            begin: regex.concat(
              /<\//,
              regex.lookahead(regex.concat(
                TAG_NAME_RE, />/
              ))
            ),
            contains: [
              {
                className: 'name',
                begin: TAG_NAME_RE,
                relevance: 0
              },
              {
                begin: />/,
                relevance: 0,
                endsParent: true
              }
            ]
          }
        ]
      };
    }
  
    /*
    Language: Ruby
    Description: Ruby is a dynamic, open source programming language with a focus on simplicity and productivity.
    Website: https://www.ruby-lang.org/
    Author: Anton Kovalyov <anton@kovalyov.net>
    Contributors: Peter Leonov <gojpeg@yandex.ru>, Vasily Polovnyov <vast@whiteants.net>, Loren Segal <lsegal@soen.ca>, Pascal Hurni <phi@ruby-reactive.org>, Cedric Sohrauer <sohrauer@googlemail.com>
    Category: common
    */
  
    function ruby(hljs) {
      const regex = hljs.regex;
      const RUBY_METHOD_RE = '([a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?)';
      // TODO: move concepts like CAMEL_CASE into `modes.js`
      const CLASS_NAME_RE = regex.either(
        /\b([A-Z]+[a-z0-9]+)+/,
        // ends in caps
        /\b([A-Z]+[a-z0-9]+)+[A-Z]+/,
      )
      ;
      const CLASS_NAME_WITH_NAMESPACE_RE = regex.concat(CLASS_NAME_RE, /(::\w+)*/);
      // very popular ruby built-ins that one might even assume
      // are actual keywords (despite that not being the case)
      const PSEUDO_KWS = [
        "include",
        "extend",
        "prepend",
        "public",
        "private",
        "protected",
        "raise",
        "throw"
      ];
      const RUBY_KEYWORDS = {
        "variable.constant": [
          "__FILE__",
          "__LINE__",
          "__ENCODING__"
        ],
        "variable.language": [
          "self",
          "super",
        ],
        keyword: [
          "alias",
          "and",
          "begin",
          "BEGIN",
          "break",
          "case",
          "class",
          "defined",
          "do",
          "else",
          "elsif",
          "end",
          "END",
          "ensure",
          "for",
          "if",
          "in",
          "module",
          "next",
          "not",
          "or",
          "redo",
          "require",
          "rescue",
          "retry",
          "return",
          "then",
          "undef",
          "unless",
          "until",
          "when",
          "while",
          "yield",
          ...PSEUDO_KWS
        ],
        built_in: [
          "proc",
          "lambda",
          "attr_accessor",
          "attr_reader",
          "attr_writer",
          "define_method",
          "private_constant",
          "module_function"
        ],
        literal: [
          "true",
          "false",
          "nil"
        ]
      };
      const YARDOCTAG = {
        className: 'doctag',
        begin: '@[A-Za-z]+'
      };
      const IRB_OBJECT = {
        begin: '#<',
        end: '>'
      };
      const COMMENT_MODES = [
        hljs.COMMENT(
          '#',
          '$',
          { contains: [ YARDOCTAG ] }
        ),
        hljs.COMMENT(
          '^=begin',
          '^=end',
          {
            contains: [ YARDOCTAG ],
            relevance: 10
          }
        ),
        hljs.COMMENT('^__END__', hljs.MATCH_NOTHING_RE)
      ];
      const SUBST = {
        className: 'subst',
        begin: /#\{/,
        end: /\}/,
        keywords: RUBY_KEYWORDS
      };
      const STRING = {
        className: 'string',
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        variants: [
          {
            begin: /'/,
            end: /'/
          },
          {
            begin: /"/,
            end: /"/
          },
          {
            begin: /`/,
            end: /`/
          },
          {
            begin: /%[qQwWx]?\(/,
            end: /\)/
          },
          {
            begin: /%[qQwWx]?\[/,
            end: /\]/
          },
          {
            begin: /%[qQwWx]?\{/,
            end: /\}/
          },
          {
            begin: /%[qQwWx]?</,
            end: />/
          },
          {
            begin: /%[qQwWx]?\//,
            end: /\//
          },
          {
            begin: /%[qQwWx]?%/,
            end: /%/
          },
          {
            begin: /%[qQwWx]?-/,
            end: /-/
          },
          {
            begin: /%[qQwWx]?\|/,
            end: /\|/
          },
          // in the following expressions, \B in the beginning suppresses recognition of ?-sequences
          // where ? is the last character of a preceding identifier, as in: `func?4`
          { begin: /\B\?(\\\d{1,3})/ },
          { begin: /\B\?(\\x[A-Fa-f0-9]{1,2})/ },
          { begin: /\B\?(\\u\{?[A-Fa-f0-9]{1,6}\}?)/ },
          { begin: /\B\?(\\M-\\C-|\\M-\\c|\\c\\M-|\\M-|\\C-\\M-)[\x20-\x7e]/ },
          { begin: /\B\?\\(c|C-)[\x20-\x7e]/ },
          { begin: /\B\?\\?\S/ },
          // heredocs
          {
            // this guard makes sure that we have an entire heredoc and not a false
            // positive (auto-detect, etc.)
            begin: regex.concat(
              /<<[-~]?'?/,
              regex.lookahead(/(\w+)(?=\W)[^\n]*\n(?:[^\n]*\n)*?\s*\1\b/)
            ),
            contains: [
              hljs.END_SAME_AS_BEGIN({
                begin: /(\w+)/,
                end: /(\w+)/,
                contains: [
                  hljs.BACKSLASH_ESCAPE,
                  SUBST
                ]
              })
            ]
          }
        ]
      };
  
      // Ruby syntax is underdocumented, but this grammar seems to be accurate
      // as of version 2.7.2 (confirmed with (irb and `Ripper.sexp(...)`)
      // https://docs.ruby-lang.org/en/2.7.0/doc/syntax/literals_rdoc.html#label-Numbers
      const decimal = '[1-9](_?[0-9])*|0';
      const digits = '[0-9](_?[0-9])*';
      const NUMBER = {
        className: 'number',
        relevance: 0,
        variants: [
          // decimal integer/float, optionally exponential or rational, optionally imaginary
          { begin: `\\b(${decimal})(\\.(${digits}))?([eE][+-]?(${digits})|r)?i?\\b` },
  
          // explicit decimal/binary/octal/hexadecimal integer,
          // optionally rational and/or imaginary
          { begin: "\\b0[dD][0-9](_?[0-9])*r?i?\\b" },
          { begin: "\\b0[bB][0-1](_?[0-1])*r?i?\\b" },
          { begin: "\\b0[oO][0-7](_?[0-7])*r?i?\\b" },
          { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*r?i?\\b" },
  
          // 0-prefixed implicit octal integer, optionally rational and/or imaginary
          { begin: "\\b0(_?[0-7])+r?i?\\b" }
        ]
      };
  
      const PARAMS = {
        variants: [
          {
            match: /\(\)/,
          },
          {
            className: 'params',
            begin: /\(/,
            end: /(?=\))/,
            excludeBegin: true,
            endsParent: true,
            keywords: RUBY_KEYWORDS,
          }
        ]
      };
  
      const INCLUDE_EXTEND = {
        match: [
          /(include|extend)\s+/,
          CLASS_NAME_WITH_NAMESPACE_RE
        ],
        scope: {
          2: "title.class"
        },
        keywords: RUBY_KEYWORDS
      };
  
      const CLASS_DEFINITION = {
        variants: [
          {
            match: [
              /class\s+/,
              CLASS_NAME_WITH_NAMESPACE_RE,
              /\s+<\s+/,
              CLASS_NAME_WITH_NAMESPACE_RE
            ]
          },
          {
            match: [
              /\b(class|module)\s+/,
              CLASS_NAME_WITH_NAMESPACE_RE
            ]
          }
        ],
        scope: {
          2: "title.class",
          4: "title.class.inherited"
        },
        keywords: RUBY_KEYWORDS
      };
  
      const UPPER_CASE_CONSTANT = {
        relevance: 0,
        match: /\b[A-Z][A-Z_0-9]+\b/,
        className: "variable.constant"
      };
  
      const METHOD_DEFINITION = {
        match: [
          /def/, /\s+/,
          RUBY_METHOD_RE
        ],
        scope: {
          1: "keyword",
          3: "title.function"
        },
        contains: [
          PARAMS
        ]
      };
  
      const OBJECT_CREATION = {
        relevance: 0,
        match: [
          CLASS_NAME_WITH_NAMESPACE_RE,
          /\.new[. (]/
        ],
        scope: {
          1: "title.class"
        }
      };
  
      // CamelCase
      const CLASS_REFERENCE = {
        relevance: 0,
        match: CLASS_NAME_RE,
        scope: "title.class"
      };
  
      const RUBY_DEFAULT_CONTAINS = [
        STRING,
        CLASS_DEFINITION,
        INCLUDE_EXTEND,
        OBJECT_CREATION,
        UPPER_CASE_CONSTANT,
        CLASS_REFERENCE,
        METHOD_DEFINITION,
        {
          // swallow namespace qualifiers before symbols
          begin: hljs.IDENT_RE + '::' },
        {
          className: 'symbol',
          begin: hljs.UNDERSCORE_IDENT_RE + '(!|\\?)?:',
          relevance: 0
        },
        {
          className: 'symbol',
          begin: ':(?!\\s)',
          contains: [
            STRING,
            { begin: RUBY_METHOD_RE }
          ],
          relevance: 0
        },
        NUMBER,
        {
          // negative-look forward attempts to prevent false matches like:
          // @ident@ or $ident$ that might indicate this is not ruby at all
          className: "variable",
          begin: '(\\$\\W)|((\\$|@@?)(\\w+))(?=[^@$?])' + `(?![A-Za-z])(?![@$?'])`
        },
        {
          className: 'params',
          begin: /\|/,
          end: /\|/,
          excludeBegin: true,
          excludeEnd: true,
          relevance: 0, // this could be a lot of things (in other languages) other than params
          keywords: RUBY_KEYWORDS
        },
        { // regexp container
          begin: '(' + hljs.RE_STARTERS_RE + '|unless)\\s*',
          keywords: 'unless',
          contains: [
            {
              className: 'regexp',
              contains: [
                hljs.BACKSLASH_ESCAPE,
                SUBST
              ],
              illegal: /\n/,
              variants: [
                {
                  begin: '/',
                  end: '/[a-z]*'
                },
                {
                  begin: /%r\{/,
                  end: /\}[a-z]*/
                },
                {
                  begin: '%r\\(',
                  end: '\\)[a-z]*'
                },
                {
                  begin: '%r!',
                  end: '![a-z]*'
                },
                {
                  begin: '%r\\[',
                  end: '\\][a-z]*'
                }
              ]
            }
          ].concat(IRB_OBJECT, COMMENT_MODES),
          relevance: 0
        }
      ].concat(IRB_OBJECT, COMMENT_MODES);
  
      SUBST.contains = RUBY_DEFAULT_CONTAINS;
      PARAMS.contains = RUBY_DEFAULT_CONTAINS;
  
      // >>
      // ?>
      const SIMPLE_PROMPT = "[>?]>";
      // irb(main):001:0>
      const DEFAULT_PROMPT = "[\\w#]+\\(\\w+\\):\\d+:\\d+[>*]";
      const RVM_PROMPT = "(\\w+-)?\\d+\\.\\d+\\.\\d+(p\\d+)?[^\\d][^>]+>";
  
      const IRB_DEFAULT = [
        {
          begin: /^\s*=>/,
          starts: {
            end: '$',
            contains: RUBY_DEFAULT_CONTAINS
          }
        },
        {
          className: 'meta.prompt',
          begin: '^(' + SIMPLE_PROMPT + "|" + DEFAULT_PROMPT + '|' + RVM_PROMPT + ')(?=[ ])',
          starts: {
            end: '$',
            keywords: RUBY_KEYWORDS,
            contains: RUBY_DEFAULT_CONTAINS
          }
        }
      ];
  
      COMMENT_MODES.unshift(IRB_OBJECT);
  
      return {
        name: 'Ruby',
        aliases: [
          'rb',
          'gemspec',
          'podspec',
          'thor',
          'irb'
        ],
        keywords: RUBY_KEYWORDS,
        illegal: /\/\*/,
        contains: [ hljs.SHEBANG({ binary: "ruby" }) ]
          .concat(IRB_DEFAULT)
          .concat(COMMENT_MODES)
          .concat(RUBY_DEFAULT_CONTAINS)
      };
    }
  
    /*
    Language: YAML
    Description: Yet Another Markdown Language
    Author: Stefan Wienert <stwienert@gmail.com>
    Contributors: Carl Baxter <carl@cbax.tech>
    Requires: ruby.js
    Website: https://yaml.org
    Category: common, config
    */
    function yaml(hljs) {
      const LITERALS = 'true false yes no null';
  
      // YAML spec allows non-reserved URI characters in tags.
      const URI_CHARACTERS = '[\\w#;/?:@&=+$,.~*\'()[\\]]+';
  
      // Define keys as starting with a word character
      // ...containing word chars, spaces, colons, forward-slashes, hyphens and periods
      // ...and ending with a colon followed immediately by a space, tab or newline.
      // The YAML spec allows for much more than this, but this covers most use-cases.
      const KEY = {
        className: 'attr',
        variants: [
          { begin: '\\w[\\w :\\/.-]*:(?=[ \t]|$)' },
          { // double quoted keys
            begin: '"\\w[\\w :\\/.-]*":(?=[ \t]|$)' },
          { // single quoted keys
            begin: '\'\\w[\\w :\\/.-]*\':(?=[ \t]|$)' }
        ]
      };
  
      const TEMPLATE_VARIABLES = {
        className: 'template-variable',
        variants: [
          { // jinja templates Ansible
            begin: /\{\{/,
            end: /\}\}/
          },
          { // Ruby i18n
            begin: /%\{/,
            end: /\}/
          }
        ]
      };
      const STRING = {
        className: 'string',
        relevance: 0,
        variants: [
          {
            begin: /'/,
            end: /'/
          },
          {
            begin: /"/,
            end: /"/
          },
          { begin: /\S+/ }
        ],
        contains: [
          hljs.BACKSLASH_ESCAPE,
          TEMPLATE_VARIABLES
        ]
      };
  
      // Strings inside of value containers (objects) can't contain braces,
      // brackets, or commas
      const CONTAINER_STRING = hljs.inherit(STRING, { variants: [
        {
          begin: /'/,
          end: /'/
        },
        {
          begin: /"/,
          end: /"/
        },
        { begin: /[^\s,{}[\]]+/ }
      ] });
  
      const DATE_RE = '[0-9]{4}(-[0-9][0-9]){0,2}';
      const TIME_RE = '([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?';
      const FRACTION_RE = '(\\.[0-9]*)?';
      const ZONE_RE = '([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?';
      const TIMESTAMP = {
        className: 'number',
        begin: '\\b' + DATE_RE + TIME_RE + FRACTION_RE + ZONE_RE + '\\b'
      };
  
      const VALUE_CONTAINER = {
        end: ',',
        endsWithParent: true,
        excludeEnd: true,
        keywords: LITERALS,
        relevance: 0
      };
      const OBJECT = {
        begin: /\{/,
        end: /\}/,
        contains: [ VALUE_CONTAINER ],
        illegal: '\\n',
        relevance: 0
      };
      const ARRAY = {
        begin: '\\[',
        end: '\\]',
        contains: [ VALUE_CONTAINER ],
        illegal: '\\n',
        relevance: 0
      };
  
      const MODES = [
        KEY,
        {
          className: 'meta',
          begin: '^---\\s*$',
          relevance: 10
        },
        { // multi line string
          // Blocks start with a | or > followed by a newline
          //
          // Indentation of subsequent lines must be the same to
          // be considered part of the block
          className: 'string',
          begin: '[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*'
        },
        { // Ruby/Rails erb
          begin: '<%[%=-]?',
          end: '[%-]?%>',
          subLanguage: 'ruby',
          excludeBegin: true,
          excludeEnd: true,
          relevance: 0
        },
        { // named tags
          className: 'type',
          begin: '!\\w+!' + URI_CHARACTERS
        },
        // https://yaml.org/spec/1.2/spec.html#id2784064
        { // verbatim tags
          className: 'type',
          begin: '!<' + URI_CHARACTERS + ">"
        },
        { // primary tags
          className: 'type',
          begin: '!' + URI_CHARACTERS
        },
        { // secondary tags
          className: 'type',
          begin: '!!' + URI_CHARACTERS
        },
        { // fragment id &ref
          className: 'meta',
          begin: '&' + hljs.UNDERSCORE_IDENT_RE + '$'
        },
        { // fragment reference *ref
          className: 'meta',
          begin: '\\*' + hljs.UNDERSCORE_IDENT_RE + '$'
        },
        { // array listing
          className: 'bullet',
          // TODO: remove |$ hack when we have proper look-ahead support
          begin: '-(?=[ ]|$)',
          relevance: 0
        },
        hljs.HASH_COMMENT_MODE,
        {
          beginKeywords: LITERALS,
          keywords: { literal: LITERALS }
        },
        TIMESTAMP,
        // numbers are any valid C-style number that
        // sit isolated from other words
        {
          className: 'number',
          begin: hljs.C_NUMBER_RE + '\\b',
          relevance: 0
        },
        OBJECT,
        ARRAY,
        STRING
      ];
  
      const VALUE_MODES = [ ...MODES ];
      VALUE_MODES.pop();
      VALUE_MODES.push(CONTAINER_STRING);
      VALUE_CONTAINER.contains = VALUE_MODES;
  
      return {
        name: 'YAML',
        case_insensitive: true,
        aliases: [ 'yml' ],
        contains: MODES
      };
    }
  
    /*
     Language: SQL
     Website: https://en.wikipedia.org/wiki/SQL
     Category: common, database
     */
  
    /*
  
    Goals:
  
    SQL is intended to highlight basic/common SQL keywords and expressions
  
    - If pretty much every single SQL server includes supports, then it's a canidate.
    - It is NOT intended to include tons of vendor specific keywords (Oracle, MySQL,
      PostgreSQL) although the list of data types is purposely a bit more expansive.
    - For more specific SQL grammars please see:
      - PostgreSQL and PL/pgSQL - core
      - T-SQL - https://github.com/highlightjs/highlightjs-tsql
      - sql_more (core)
  
     */
  
    function sql(hljs) {
      const regex = hljs.regex;
      const COMMENT_MODE = hljs.COMMENT('--', '$');
      const STRING = {
        className: 'string',
        variants: [
          {
            begin: /'/,
            end: /'/,
            contains: [ { begin: /''/ } ]
          }
        ]
      };
      const QUOTED_IDENTIFIER = {
        begin: /"/,
        end: /"/,
        contains: [ { begin: /""/ } ]
      };
  
      const LITERALS = [
        "true",
        "false",
        // Not sure it's correct to call NULL literal, and clauses like IS [NOT] NULL look strange that way.
        // "null",
        "unknown"
      ];
  
      const MULTI_WORD_TYPES = [
        "double precision",
        "large object",
        "with timezone",
        "without timezone"
      ];
  
      const TYPES = [
        'bigint',
        'binary',
        'blob',
        'boolean',
        'char',
        'character',
        'clob',
        'date',
        'dec',
        'decfloat',
        'decimal',
        'float',
        'int',
        'integer',
        'interval',
        'nchar',
        'nclob',
        'national',
        'numeric',
        'real',
        'row',
        'smallint',
        'time',
        'timestamp',
        'varchar',
        'varying', // modifier (character varying)
        'varbinary'
      ];
  
      const NON_RESERVED_WORDS = [
        "add",
        "asc",
        "collation",
        "desc",
        "final",
        "first",
        "last",
        "view"
      ];
  
      // https://jakewheat.github.io/sql-overview/sql-2016-foundation-grammar.html#reserved-word
      const RESERVED_WORDS = [
        "abs",
        "acos",
        "all",
        "allocate",
        "alter",
        "and",
        "any",
        "are",
        "array",
        "array_agg",
        "array_max_cardinality",
        "as",
        "asensitive",
        "asin",
        "asymmetric",
        "at",
        "atan",
        "atomic",
        "authorization",
        "avg",
        "begin",
        "begin_frame",
        "begin_partition",
        "between",
        "bigint",
        "binary",
        "blob",
        "boolean",
        "both",
        "by",
        "call",
        "called",
        "cardinality",
        "cascaded",
        "case",
        "cast",
        "ceil",
        "ceiling",
        "char",
        "char_length",
        "character",
        "character_length",
        "check",
        "classifier",
        "clob",
        "close",
        "coalesce",
        "collate",
        "collect",
        "column",
        "commit",
        "condition",
        "connect",
        "constraint",
        "contains",
        "convert",
        "copy",
        "corr",
        "corresponding",
        "cos",
        "cosh",
        "count",
        "covar_pop",
        "covar_samp",
        "create",
        "cross",
        "cube",
        "cume_dist",
        "current",
        "current_catalog",
        "current_date",
        "current_default_transform_group",
        "current_path",
        "current_role",
        "current_row",
        "current_schema",
        "current_time",
        "current_timestamp",
        "current_path",
        "current_role",
        "current_transform_group_for_type",
        "current_user",
        "cursor",
        "cycle",
        "date",
        "day",
        "deallocate",
        "dec",
        "decimal",
        "decfloat",
        "declare",
        "default",
        "define",
        "delete",
        "dense_rank",
        "deref",
        "describe",
        "deterministic",
        "disconnect",
        "distinct",
        "double",
        "drop",
        "dynamic",
        "each",
        "element",
        "else",
        "empty",
        "end",
        "end_frame",
        "end_partition",
        "end-exec",
        "equals",
        "escape",
        "every",
        "except",
        "exec",
        "execute",
        "exists",
        "exp",
        "external",
        "extract",
        "false",
        "fetch",
        "filter",
        "first_value",
        "float",
        "floor",
        "for",
        "foreign",
        "frame_row",
        "free",
        "from",
        "full",
        "function",
        "fusion",
        "get",
        "global",
        "grant",
        "group",
        "grouping",
        "groups",
        "having",
        "hold",
        "hour",
        "identity",
        "in",
        "indicator",
        "initial",
        "inner",
        "inout",
        "insensitive",
        "insert",
        "int",
        "integer",
        "intersect",
        "intersection",
        "interval",
        "into",
        "is",
        "join",
        "json_array",
        "json_arrayagg",
        "json_exists",
        "json_object",
        "json_objectagg",
        "json_query",
        "json_table",
        "json_table_primitive",
        "json_value",
        "lag",
        "language",
        "large",
        "last_value",
        "lateral",
        "lead",
        "leading",
        "left",
        "like",
        "like_regex",
        "listagg",
        "ln",
        "local",
        "localtime",
        "localtimestamp",
        "log",
        "log10",
        "lower",
        "match",
        "match_number",
        "match_recognize",
        "matches",
        "max",
        "member",
        "merge",
        "method",
        "min",
        "minute",
        "mod",
        "modifies",
        "module",
        "month",
        "multiset",
        "national",
        "natural",
        "nchar",
        "nclob",
        "new",
        "no",
        "none",
        "normalize",
        "not",
        "nth_value",
        "ntile",
        "null",
        "nullif",
        "numeric",
        "octet_length",
        "occurrences_regex",
        "of",
        "offset",
        "old",
        "omit",
        "on",
        "one",
        "only",
        "open",
        "or",
        "order",
        "out",
        "outer",
        "over",
        "overlaps",
        "overlay",
        "parameter",
        "partition",
        "pattern",
        "per",
        "percent",
        "percent_rank",
        "percentile_cont",
        "percentile_disc",
        "period",
        "portion",
        "position",
        "position_regex",
        "power",
        "precedes",
        "precision",
        "prepare",
        "primary",
        "procedure",
        "ptf",
        "range",
        "rank",
        "reads",
        "real",
        "recursive",
        "ref",
        "references",
        "referencing",
        "regr_avgx",
        "regr_avgy",
        "regr_count",
        "regr_intercept",
        "regr_r2",
        "regr_slope",
        "regr_sxx",
        "regr_sxy",
        "regr_syy",
        "release",
        "result",
        "return",
        "returns",
        "revoke",
        "right",
        "rollback",
        "rollup",
        "row",
        "row_number",
        "rows",
        "running",
        "savepoint",
        "scope",
        "scroll",
        "search",
        "second",
        "seek",
        "select",
        "sensitive",
        "session_user",
        "set",
        "show",
        "similar",
        "sin",
        "sinh",
        "skip",
        "smallint",
        "some",
        "specific",
        "specifictype",
        "sql",
        "sqlexception",
        "sqlstate",
        "sqlwarning",
        "sqrt",
        "start",
        "static",
        "stddev_pop",
        "stddev_samp",
        "submultiset",
        "subset",
        "substring",
        "substring_regex",
        "succeeds",
        "sum",
        "symmetric",
        "system",
        "system_time",
        "system_user",
        "table",
        "tablesample",
        "tan",
        "tanh",
        "then",
        "time",
        "timestamp",
        "timezone_hour",
        "timezone_minute",
        "to",
        "trailing",
        "translate",
        "translate_regex",
        "translation",
        "treat",
        "trigger",
        "trim",
        "trim_array",
        "true",
        "truncate",
        "uescape",
        "union",
        "unique",
        "unknown",
        "unnest",
        "update",
        "upper",
        "user",
        "using",
        "value",
        "values",
        "value_of",
        "var_pop",
        "var_samp",
        "varbinary",
        "varchar",
        "varying",
        "versioning",
        "when",
        "whenever",
        "where",
        "width_bucket",
        "window",
        "with",
        "within",
        "without",
        "year",
      ];
  
      // these are reserved words we have identified to be functions
      // and should only be highlighted in a dispatch-like context
      // ie, array_agg(...), etc.
      const RESERVED_FUNCTIONS = [
        "abs",
        "acos",
        "array_agg",
        "asin",
        "atan",
        "avg",
        "cast",
        "ceil",
        "ceiling",
        "coalesce",
        "corr",
        "cos",
        "cosh",
        "count",
        "covar_pop",
        "covar_samp",
        "cume_dist",
        "dense_rank",
        "deref",
        "element",
        "exp",
        "extract",
        "first_value",
        "floor",
        "json_array",
        "json_arrayagg",
        "json_exists",
        "json_object",
        "json_objectagg",
        "json_query",
        "json_table",
        "json_table_primitive",
        "json_value",
        "lag",
        "last_value",
        "lead",
        "listagg",
        "ln",
        "log",
        "log10",
        "lower",
        "max",
        "min",
        "mod",
        "nth_value",
        "ntile",
        "nullif",
        "percent_rank",
        "percentile_cont",
        "percentile_disc",
        "position",
        "position_regex",
        "power",
        "rank",
        "regr_avgx",
        "regr_avgy",
        "regr_count",
        "regr_intercept",
        "regr_r2",
        "regr_slope",
        "regr_sxx",
        "regr_sxy",
        "regr_syy",
        "row_number",
        "sin",
        "sinh",
        "sqrt",
        "stddev_pop",
        "stddev_samp",
        "substring",
        "substring_regex",
        "sum",
        "tan",
        "tanh",
        "translate",
        "translate_regex",
        "treat",
        "trim",
        "trim_array",
        "unnest",
        "upper",
        "value_of",
        "var_pop",
        "var_samp",
        "width_bucket",
      ];
  
      // these functions can
      const POSSIBLE_WITHOUT_PARENS = [
        "current_catalog",
        "current_date",
        "current_default_transform_group",
        "current_path",
        "current_role",
        "current_schema",
        "current_transform_group_for_type",
        "current_user",
        "session_user",
        "system_time",
        "system_user",
        "current_time",
        "localtime",
        "current_timestamp",
        "localtimestamp"
      ];
  
      // those exist to boost relevance making these very
      // "SQL like" keyword combos worth +1 extra relevance
      const COMBOS = [
        "create table",
        "insert into",
        "primary key",
        "foreign key",
        "not null",
        "alter table",
        "add constraint",
        "grouping sets",
        "on overflow",
        "character set",
        "respect nulls",
        "ignore nulls",
        "nulls first",
        "nulls last",
        "depth first",
        "breadth first"
      ];
  
      const FUNCTIONS = RESERVED_FUNCTIONS;
  
      const KEYWORDS = [
        ...RESERVED_WORDS,
        ...NON_RESERVED_WORDS
      ].filter((keyword) => {
        return !RESERVED_FUNCTIONS.includes(keyword);
      });
  
      const VARIABLE = {
        className: "variable",
        begin: /@[a-z0-9][a-z0-9_]*/,
      };
  
      const OPERATOR = {
        className: "operator",
        begin: /[-+*/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?/,
        relevance: 0,
      };
  
      const FUNCTION_CALL = {
        begin: regex.concat(/\b/, regex.either(...FUNCTIONS), /\s*\(/),
        relevance: 0,
        keywords: { built_in: FUNCTIONS }
      };
  
      // keywords with less than 3 letters are reduced in relevancy
      function reduceRelevancy(list, {
        exceptions, when
      } = {}) {
        const qualifyFn = when;
        exceptions = exceptions || [];
        return list.map((item) => {
          if (item.match(/\|\d+$/) || exceptions.includes(item)) {
            return item;
          } else if (qualifyFn(item)) {
            return `${item}|0`;
          } else {
            return item;
          }
        });
      }
  
      return {
        name: 'SQL',
        case_insensitive: true,
        // does not include {} or HTML tags `</`
        illegal: /[{}]|<\//,
        keywords: {
          $pattern: /\b[\w\.]+/,
          keyword:
            reduceRelevancy(KEYWORDS, { when: (x) => x.length < 3 }),
          literal: LITERALS,
          type: TYPES,
          built_in: POSSIBLE_WITHOUT_PARENS
        },
        contains: [
          {
            begin: regex.either(...COMBOS),
            relevance: 0,
            keywords: {
              $pattern: /[\w\.]+/,
              keyword: KEYWORDS.concat(COMBOS),
              literal: LITERALS,
              type: TYPES
            },
          },
          {
            className: "type",
            begin: regex.either(...MULTI_WORD_TYPES)
          },
          FUNCTION_CALL,
          VARIABLE,
          STRING,
          QUOTED_IDENTIFIER,
          hljs.C_NUMBER_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          COMMENT_MODE,
          OPERATOR
        ]
      };
    }
  
    /*
    Language: Stata
    Author: Brian Quistorff <bquistorff@gmail.com>
    Contributors: Drew McDonald <drewmcdo@gmail.com>
    Description: Stata is a general-purpose statistical software package created in 1985 by StataCorp.
    Website: https://en.wikipedia.org/wiki/Stata
    Category: scientific
    */
  
    /*
      This is a fork and modification of Drew McDonald's file (https://github.com/drewmcdonald/stata-highlighting). I have also included a list of builtin commands from https://bugs.kde.org/show_bug.cgi?id=135646.
    */
  
    function stata(hljs) {
      return {
        name: 'Stata',
        aliases: [
          'do',
          'ado'
        ],
        case_insensitive: true,
        keywords: 'if else in foreach for forv forva forval forvalu forvalue forvalues by bys bysort xi quietly qui capture about ac ac_7 acprplot acprplot_7 adjust ado adopath adoupdate alpha ameans an ano anov anova anova_estat anova_terms anovadef aorder ap app appe appen append arch arch_dr arch_estat arch_p archlm areg areg_p args arima arima_dr arima_estat arima_p as asmprobit asmprobit_estat asmprobit_lf asmprobit_mfx__dlg asmprobit_p ass asse asser assert avplot avplot_7 avplots avplots_7 bcskew0 bgodfrey bias binreg bip0_lf biplot bipp_lf bipr_lf bipr_p biprobit bitest bitesti bitowt blogit bmemsize boot bootsamp bootstrap bootstrap_8 boxco_l boxco_p boxcox boxcox_6 boxcox_p bprobit br break brier bro brow brows browse brr brrstat bs bs_7 bsampl_w bsample bsample_7 bsqreg bstat bstat_7 bstat_8 bstrap bstrap_7 bubble bubbleplot ca ca_estat ca_p cabiplot camat canon canon_8 canon_8_p canon_estat canon_p cap caprojection capt captu captur capture cat cc cchart cchart_7 cci cd censobs_table centile cf char chdir checkdlgfiles checkestimationsample checkhlpfiles checksum chelp ci cii cl class classutil clear cli clis clist clo clog clog_lf clog_p clogi clogi_sw clogit clogit_lf clogit_p clogitp clogl_sw cloglog clonevar clslistarray cluster cluster_measures cluster_stop cluster_tree cluster_tree_8 clustermat cmdlog cnr cnre cnreg cnreg_p cnreg_sw cnsreg codebook collaps4 collapse colormult_nb colormult_nw compare compress conf confi confir confirm conren cons const constr constra constrai constrain constraint continue contract copy copyright copysource cor corc corr corr2data corr_anti corr_kmo corr_smc corre correl correla correlat correlate corrgram cou coun count cox cox_p cox_sw coxbase coxhaz coxvar cprplot cprplot_7 crc cret cretu cretur creturn cross cs cscript cscript_log csi ct ct_is ctset ctst_5 ctst_st cttost cumsp cumsp_7 cumul cusum cusum_7 cutil d|0 datasig datasign datasigna datasignat datasignatu datasignatur datasignature datetof db dbeta de dec deco decod decode deff des desc descr descri describ describe destring dfbeta dfgls dfuller di di_g dir dirstats dis discard disp disp_res disp_s displ displa display distinct do doe doed doedi doedit dotplot dotplot_7 dprobit drawnorm drop ds ds_util dstdize duplicates durbina dwstat dydx e|0 ed edi edit egen eivreg emdef en enc enco encod encode eq erase ereg ereg_lf ereg_p ereg_sw ereghet ereghet_glf ereghet_glf_sh ereghet_gp ereghet_ilf ereghet_ilf_sh ereghet_ip eret eretu eretur ereturn err erro error esize est est_cfexist est_cfname est_clickable est_expand est_hold est_table est_unhold est_unholdok estat estat_default estat_summ estat_vce_only esti estimates etodow etof etomdy ex exi exit expand expandcl fac fact facto factor factor_estat factor_p factor_pca_rotated factor_rotate factormat fcast fcast_compute fcast_graph fdades fdadesc fdadescr fdadescri fdadescrib fdadescribe fdasav fdasave fdause fh_st file open file read file close file filefilter fillin find_hlp_file findfile findit findit_7 fit fl fli flis flist for5_0 forest forestplot form forma format fpredict frac_154 frac_adj frac_chk frac_cox frac_ddp frac_dis frac_dv frac_in frac_mun frac_pp frac_pq frac_pv frac_wgt frac_xo fracgen fracplot fracplot_7 fracpoly fracpred fron_ex fron_hn fron_p fron_tn fron_tn2 frontier ftodate ftoe ftomdy ftowdate funnel funnelplot g|0 gamhet_glf gamhet_gp gamhet_ilf gamhet_ip gamma gamma_d2 gamma_p gamma_sw gammahet gdi_hexagon gdi_spokes ge gen gene gener genera generat generate genrank genstd genvmean gettoken gl gladder gladder_7 glim_l01 glim_l02 glim_l03 glim_l04 glim_l05 glim_l06 glim_l07 glim_l08 glim_l09 glim_l10 glim_l11 glim_l12 glim_lf glim_mu glim_nw1 glim_nw2 glim_nw3 glim_p glim_v1 glim_v2 glim_v3 glim_v4 glim_v5 glim_v6 glim_v7 glm glm_6 glm_p glm_sw glmpred glo glob globa global glogit glogit_8 glogit_p gmeans gnbre_lf gnbreg gnbreg_5 gnbreg_p gomp_lf gompe_sw gomper_p gompertz gompertzhet gomphet_glf gomphet_glf_sh gomphet_gp gomphet_ilf gomphet_ilf_sh gomphet_ip gphdot gphpen gphprint gprefs gprobi_p gprobit gprobit_8 gr gr7 gr_copy gr_current gr_db gr_describe gr_dir gr_draw gr_draw_replay gr_drop gr_edit gr_editviewopts gr_example gr_example2 gr_export gr_print gr_qscheme gr_query gr_read gr_rename gr_replay gr_save gr_set gr_setscheme gr_table gr_undo gr_use graph graph7 grebar greigen greigen_7 greigen_8 grmeanby grmeanby_7 gs_fileinfo gs_filetype gs_graphinfo gs_stat gsort gwood h|0 hadimvo hareg hausman haver he heck_d2 heckma_p heckman heckp_lf heckpr_p heckprob hel help hereg hetpr_lf hetpr_p hetprob hettest hexdump hilite hist hist_7 histogram hlogit hlu hmeans hotel hotelling hprobit hreg hsearch icd9 icd9_ff icd9p iis impute imtest inbase include inf infi infil infile infix inp inpu input ins insheet insp inspe inspec inspect integ inten intreg intreg_7 intreg_p intrg2_ll intrg_ll intrg_ll2 ipolate iqreg ir irf irf_create irfm iri is_svy is_svysum isid istdize ivprob_1_lf ivprob_lf ivprobit ivprobit_p ivreg ivreg_footnote ivtob_1_lf ivtob_lf ivtobit ivtobit_p jackknife jacknife jknife jknife_6 jknife_8 jkstat joinby kalarma1 kap kap_3 kapmeier kappa kapwgt kdensity kdensity_7 keep ksm ksmirnov ktau kwallis l|0 la lab labbe labbeplot labe label labelbook ladder levels levelsof leverage lfit lfit_p li lincom line linktest lis list lloghet_glf lloghet_glf_sh lloghet_gp lloghet_ilf lloghet_ilf_sh lloghet_ip llogi_sw llogis_p llogist llogistic llogistichet lnorm_lf lnorm_sw lnorma_p lnormal lnormalhet lnormhet_glf lnormhet_glf_sh lnormhet_gp lnormhet_ilf lnormhet_ilf_sh lnormhet_ip lnskew0 loadingplot loc loca local log logi logis_lf logistic logistic_p logit logit_estat logit_p loglogs logrank loneway lookfor lookup lowess lowess_7 lpredict lrecomp lroc lroc_7 lrtest ls lsens lsens_7 lsens_x lstat ltable ltable_7 ltriang lv lvr2plot lvr2plot_7 m|0 ma mac macr macro makecns man manova manova_estat manova_p manovatest mantel mark markin markout marksample mat mat_capp mat_order mat_put_rr mat_rapp mata mata_clear mata_describe mata_drop mata_matdescribe mata_matsave mata_matuse mata_memory mata_mlib mata_mosave mata_rename mata_which matalabel matcproc matlist matname matr matri matrix matrix_input__dlg matstrik mcc mcci md0_ md1_ md1debug_ md2_ md2debug_ mds mds_estat mds_p mdsconfig mdslong mdsmat mdsshepard mdytoe mdytof me_derd mean means median memory memsize menl meqparse mer merg merge meta mfp mfx mhelp mhodds minbound mixed_ll mixed_ll_reparm mkassert mkdir mkmat mkspline ml ml_5 ml_adjs ml_bhhhs ml_c_d ml_check ml_clear ml_cnt ml_debug ml_defd ml_e0 ml_e0_bfgs ml_e0_cycle ml_e0_dfp ml_e0i ml_e1 ml_e1_bfgs ml_e1_bhhh ml_e1_cycle ml_e1_dfp ml_e2 ml_e2_cycle ml_ebfg0 ml_ebfr0 ml_ebfr1 ml_ebh0q ml_ebhh0 ml_ebhr0 ml_ebr0i ml_ecr0i ml_edfp0 ml_edfr0 ml_edfr1 ml_edr0i ml_eds ml_eer0i ml_egr0i ml_elf ml_elf_bfgs ml_elf_bhhh ml_elf_cycle ml_elf_dfp ml_elfi ml_elfs ml_enr0i ml_enrr0 ml_erdu0 ml_erdu0_bfgs ml_erdu0_bhhh ml_erdu0_bhhhq ml_erdu0_cycle ml_erdu0_dfp ml_erdu0_nrbfgs ml_exde ml_footnote ml_geqnr ml_grad0 ml_graph ml_hbhhh ml_hd0 ml_hold ml_init ml_inv ml_log ml_max ml_mlout ml_mlout_8 ml_model ml_nb0 ml_opt ml_p ml_plot ml_query ml_rdgrd ml_repor ml_s_e ml_score ml_searc ml_technique ml_unhold mleval mlf_ mlmatbysum mlmatsum mlog mlogi mlogit mlogit_footnote mlogit_p mlopts mlsum mlvecsum mnl0_ mor more mov move mprobit mprobit_lf mprobit_p mrdu0_ mrdu1_ mvdecode mvencode mvreg mvreg_estat n|0 nbreg nbreg_al nbreg_lf nbreg_p nbreg_sw nestreg net newey newey_7 newey_p news nl nl_7 nl_9 nl_9_p nl_p nl_p_7 nlcom nlcom_p nlexp2 nlexp2_7 nlexp2a nlexp2a_7 nlexp3 nlexp3_7 nlgom3 nlgom3_7 nlgom4 nlgom4_7 nlinit nllog3 nllog3_7 nllog4 nllog4_7 nlog_rd nlogit nlogit_p nlogitgen nlogittree nlpred no nobreak noi nois noisi noisil noisily note notes notes_dlg nptrend numlabel numlist odbc old_ver olo olog ologi ologi_sw ologit ologit_p ologitp on one onew onewa oneway op_colnm op_comp op_diff op_inv op_str opr opro oprob oprob_sw oprobi oprobi_p oprobit oprobitp opts_exclusive order orthog orthpoly ou out outf outfi outfil outfile outs outsh outshe outshee outsheet ovtest pac pac_7 palette parse parse_dissim pause pca pca_8 pca_display pca_estat pca_p pca_rotate pcamat pchart pchart_7 pchi pchi_7 pcorr pctile pentium pergram pergram_7 permute permute_8 personal peto_st pkcollapse pkcross pkequiv pkexamine pkexamine_7 pkshape pksumm pksumm_7 pl plo plot plugin pnorm pnorm_7 poisgof poiss_lf poiss_sw poisso_p poisson poisson_estat post postclose postfile postutil pperron pr prais prais_e prais_e2 prais_p predict predictnl preserve print pro prob probi probit probit_estat probit_p proc_time procoverlay procrustes procrustes_estat procrustes_p profiler prog progr progra program prop proportion prtest prtesti pwcorr pwd q\\s qby qbys qchi qchi_7 qladder qladder_7 qnorm qnorm_7 qqplot qqplot_7 qreg qreg_c qreg_p qreg_sw qu quadchk quantile quantile_7 que quer query range ranksum ratio rchart rchart_7 rcof recast reclink recode reg reg3 reg3_p regdw regr regre regre_p2 regres regres_p regress regress_estat regriv_p remap ren rena renam rename renpfix repeat replace report reshape restore ret retu retur return rm rmdir robvar roccomp roccomp_7 roccomp_8 rocf_lf rocfit rocfit_8 rocgold rocplot rocplot_7 roctab roctab_7 rolling rologit rologit_p rot rota rotat rotate rotatemat rreg rreg_p ru run runtest rvfplot rvfplot_7 rvpplot rvpplot_7 sa safesum sample sampsi sav save savedresults saveold sc sca scal scala scalar scatter scm_mine sco scob_lf scob_p scobi_sw scobit scor score scoreplot scoreplot_help scree screeplot screeplot_help sdtest sdtesti se search separate seperate serrbar serrbar_7 serset set set_defaults sfrancia sh she shel shell shewhart shewhart_7 signestimationsample signrank signtest simul simul_7 simulate simulate_8 sktest sleep slogit slogit_d2 slogit_p smooth snapspan so sor sort spearman spikeplot spikeplot_7 spikeplt spline_x split sqreg sqreg_p sret sretu sretur sreturn ssc st st_ct st_hc st_hcd st_hcd_sh st_is st_issys st_note st_promo st_set st_show st_smpl st_subid stack statsby statsby_8 stbase stci stci_7 stcox stcox_estat stcox_fr stcox_fr_ll stcox_p stcox_sw stcoxkm stcoxkm_7 stcstat stcurv stcurve stcurve_7 stdes stem stepwise stereg stfill stgen stir stjoin stmc stmh stphplot stphplot_7 stphtest stphtest_7 stptime strate strate_7 streg streg_sw streset sts sts_7 stset stsplit stsum sttocc sttoct stvary stweib su suest suest_8 sum summ summa summar summari summariz summarize sunflower sureg survcurv survsum svar svar_p svmat svy svy_disp svy_dreg svy_est svy_est_7 svy_estat svy_get svy_gnbreg_p svy_head svy_header svy_heckman_p svy_heckprob_p svy_intreg_p svy_ivreg_p svy_logistic_p svy_logit_p svy_mlogit_p svy_nbreg_p svy_ologit_p svy_oprobit_p svy_poisson_p svy_probit_p svy_regress_p svy_sub svy_sub_7 svy_x svy_x_7 svy_x_p svydes svydes_8 svygen svygnbreg svyheckman svyheckprob svyintreg svyintreg_7 svyintrg svyivreg svylc svylog_p svylogit svymarkout svymarkout_8 svymean svymlog svymlogit svynbreg svyolog svyologit svyoprob svyoprobit svyopts svypois svypois_7 svypoisson svyprobit svyprobt svyprop svyprop_7 svyratio svyreg svyreg_p svyregress svyset svyset_7 svyset_8 svytab svytab_7 svytest svytotal sw sw_8 swcnreg swcox swereg swilk swlogis swlogit swologit swoprbt swpois swprobit swqreg swtobit swweib symmetry symmi symplot symplot_7 syntax sysdescribe sysdir sysuse szroeter ta tab tab1 tab2 tab_or tabd tabdi tabdis tabdisp tabi table tabodds tabodds_7 tabstat tabu tabul tabula tabulat tabulate te tempfile tempname tempvar tes test testnl testparm teststd tetrachoric time_it timer tis tob tobi tobit tobit_p tobit_sw token tokeni tokeniz tokenize tostring total translate translator transmap treat_ll treatr_p treatreg trim trimfill trnb_cons trnb_mean trpoiss_d2 trunc_ll truncr_p truncreg tsappend tset tsfill tsline tsline_ex tsreport tsrevar tsrline tsset tssmooth tsunab ttest ttesti tut_chk tut_wait tutorial tw tware_st two twoway twoway__fpfit_serset twoway__function_gen twoway__histogram_gen twoway__ipoint_serset twoway__ipoints_serset twoway__kdensity_gen twoway__lfit_serset twoway__normgen_gen twoway__pci_serset twoway__qfit_serset twoway__scatteri_serset twoway__sunflower_gen twoway_ksm_serset ty typ type typeof u|0 unab unabbrev unabcmd update us use uselabel var var_mkcompanion var_p varbasic varfcast vargranger varirf varirf_add varirf_cgraph varirf_create varirf_ctable varirf_describe varirf_dir varirf_drop varirf_erase varirf_graph varirf_ograph varirf_rename varirf_set varirf_table varlist varlmar varnorm varsoc varstable varstable_w varstable_w2 varwle vce vec vec_fevd vec_mkphi vec_p vec_p_w vecirf_create veclmar veclmar_w vecnorm vecnorm_w vecrank vecstable verinst vers versi versio version view viewsource vif vwls wdatetof webdescribe webseek webuse weib1_lf weib2_lf weib_lf weib_lf0 weibhet_glf weibhet_glf_sh weibhet_glfa weibhet_glfa_sh weibhet_gp weibhet_ilf weibhet_ilf_sh weibhet_ilfa weibhet_ilfa_sh weibhet_ip weibu_sw weibul_p weibull weibull_c weibull_s weibullhet wh whelp whi which whil while wilc_st wilcoxon win wind windo window winexec wntestb wntestb_7 wntestq xchart xchart_7 xcorr xcorr_7 xi xi_6 xmlsav xmlsave xmluse xpose xsh xshe xshel xshell xt_iis xt_tis xtab_p xtabond xtbin_p xtclog xtcloglog xtcloglog_8 xtcloglog_d2 xtcloglog_pa_p xtcloglog_re_p xtcnt_p xtcorr xtdata xtdes xtfront_p xtfrontier xtgee xtgee_elink xtgee_estat xtgee_makeivar xtgee_p xtgee_plink xtgls xtgls_p xthaus xthausman xtht_p xthtaylor xtile xtint_p xtintreg xtintreg_8 xtintreg_d2 xtintreg_p xtivp_1 xtivp_2 xtivreg xtline xtline_ex xtlogit xtlogit_8 xtlogit_d2 xtlogit_fe_p xtlogit_pa_p xtlogit_re_p xtmixed xtmixed_estat xtmixed_p xtnb_fe xtnb_lf xtnbreg xtnbreg_pa_p xtnbreg_refe_p xtpcse xtpcse_p xtpois xtpoisson xtpoisson_d2 xtpoisson_pa_p xtpoisson_refe_p xtpred xtprobit xtprobit_8 xtprobit_d2 xtprobit_re_p xtps_fe xtps_lf xtps_ren xtps_ren_8 xtrar_p xtrc xtrc_p xtrchh xtrefe_p xtreg xtreg_be xtreg_fe xtreg_ml xtreg_pa_p xtreg_re xtregar xtrere_p xtset xtsf_ll xtsf_llti xtsum xttab xttest0 xttobit xttobit_8 xttobit_p xttrans yx yxview__barlike_draw yxview_area_draw yxview_bar_draw yxview_dot_draw yxview_dropline_draw yxview_function_draw yxview_iarrow_draw yxview_ilabels_draw yxview_normal_draw yxview_pcarrow_draw yxview_pcbarrow_draw yxview_pccapsym_draw yxview_pcscatter_draw yxview_pcspike_draw yxview_rarea_draw yxview_rbar_draw yxview_rbarm_draw yxview_rcap_draw yxview_rcapsym_draw yxview_rconnected_draw yxview_rline_draw yxview_rscatter_draw yxview_rspike_draw yxview_spike_draw yxview_sunflower_draw zap_s zinb zinb_llf zinb_plf zip zip_llf zip_p zip_plf zt_ct_5 zt_hc_5 zt_hcd_5 zt_is_5 zt_iss_5 zt_sho_5 zt_smp_5 ztbase_5 ztcox_5 ztdes_5 ztereg_5 ztfill_5 ztgen_5 ztir_5 ztjoin_5 ztnb ztnb_p ztp ztp_p zts_5 ztset_5 ztspli_5 ztsum_5 zttoct_5 ztvary_5 ztweib_5',
        contains: [
          {
            className: 'symbol',
            begin: /`[a-zA-Z0-9_]+'/
          },
          {
            className: 'variable',
            begin: /\$\{?[a-zA-Z0-9_]+\}?/,
            relevance: 0
          },
          {
            className: 'string',
            variants: [
              { begin: '`"[^\r\n]*?"\'' },
              { begin: '"[^\r\n"]*"' }
            ]
          },
  
          {
            className: 'built_in',
            variants: [ { begin: '\\b(abs|acos|asin|atan|atan2|atanh|ceil|cloglog|comb|cos|digamma|exp|floor|invcloglog|invlogit|ln|lnfact|lnfactorial|lngamma|log|log10|max|min|mod|reldif|round|sign|sin|sqrt|sum|tan|tanh|trigamma|trunc|betaden|Binomial|binorm|binormal|chi2|chi2tail|dgammapda|dgammapdada|dgammapdadx|dgammapdx|dgammapdxdx|F|Fden|Ftail|gammaden|gammap|ibeta|invbinomial|invchi2|invchi2tail|invF|invFtail|invgammap|invibeta|invnchi2|invnFtail|invnibeta|invnorm|invnormal|invttail|nbetaden|nchi2|nFden|nFtail|nibeta|norm|normal|normalden|normd|npnchi2|tden|ttail|uniform|abbrev|char|index|indexnot|length|lower|ltrim|match|plural|proper|real|regexm|regexr|regexs|reverse|rtrim|string|strlen|strlower|strltrim|strmatch|strofreal|strpos|strproper|strreverse|strrtrim|strtrim|strupper|subinstr|subinword|substr|trim|upper|word|wordcount|_caller|autocode|byteorder|chop|clip|cond|e|epsdouble|epsfloat|group|inlist|inrange|irecode|matrix|maxbyte|maxdouble|maxfloat|maxint|maxlong|mi|minbyte|mindouble|minfloat|minint|minlong|missing|r|recode|replay|return|s|scalar|d|date|day|dow|doy|halfyear|mdy|month|quarter|week|year|d|daily|dofd|dofh|dofm|dofq|dofw|dofy|h|halfyearly|hofd|m|mofd|monthly|q|qofd|quarterly|tin|twithin|w|weekly|wofd|y|yearly|yh|ym|yofd|yq|yw|cholesky|colnumb|colsof|corr|det|diag|diag0cnt|el|get|hadamard|I|inv|invsym|issym|issymmetric|J|matmissing|matuniform|mreldif|nullmat|rownumb|rowsof|sweep|syminv|trace|vec|vecdiag)(?=\\()' } ]
          },
  
          hljs.COMMENT('^[ \t]*\\*.*$', false),
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ]
      };
    }
  
    const MODES = (hljs) => {
      return {
        IMPORTANT: {
          scope: 'meta',
          begin: '!important'
        },
        BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
        HEXCOLOR: {
          scope: 'number',
          begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
        },
        FUNCTION_DISPATCH: {
          className: "built_in",
          begin: /[\w-]+(?=\()/
        },
        ATTRIBUTE_SELECTOR_MODE: {
          scope: 'selector-attr',
          begin: /\[/,
          end: /\]/,
          illegal: '$',
          contains: [
            hljs.APOS_STRING_MODE,
            hljs.QUOTE_STRING_MODE
          ]
        },
        CSS_NUMBER_MODE: {
          scope: 'number',
          begin: hljs.NUMBER_RE + '(' +
            '%|em|ex|ch|rem' +
            '|vw|vh|vmin|vmax' +
            '|cm|mm|in|pt|pc|px' +
            '|deg|grad|rad|turn' +
            '|s|ms' +
            '|Hz|kHz' +
            '|dpi|dpcm|dppx' +
            ')?',
          relevance: 0
        },
        CSS_VARIABLE: {
          className: "attr",
          begin: /--[A-Za-z][A-Za-z0-9_-]*/
        }
      };
    };
  
    const TAGS = [
      'a',
      'abbr',
      'address',
      'article',
      'aside',
      'audio',
      'b',
      'blockquote',
      'body',
      'button',
      'canvas',
      'caption',
      'cite',
      'code',
      'dd',
      'del',
      'details',
      'dfn',
      'div',
      'dl',
      'dt',
      'em',
      'fieldset',
      'figcaption',
      'figure',
      'footer',
      'form',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'header',
      'hgroup',
      'html',
      'i',
      'iframe',
      'img',
      'input',
      'ins',
      'kbd',
      'label',
      'legend',
      'li',
      'main',
      'mark',
      'menu',
      'nav',
      'object',
      'ol',
      'p',
      'q',
      'quote',
      'samp',
      'section',
      'span',
      'strong',
      'summary',
      'sup',
      'table',
      'tbody',
      'td',
      'textarea',
      'tfoot',
      'th',
      'thead',
      'time',
      'tr',
      'ul',
      'var',
      'video'
    ];
  
    const MEDIA_FEATURES = [
      'any-hover',
      'any-pointer',
      'aspect-ratio',
      'color',
      'color-gamut',
      'color-index',
      'device-aspect-ratio',
      'device-height',
      'device-width',
      'display-mode',
      'forced-colors',
      'grid',
      'height',
      'hover',
      'inverted-colors',
      'monochrome',
      'orientation',
      'overflow-block',
      'overflow-inline',
      'pointer',
      'prefers-color-scheme',
      'prefers-contrast',
      'prefers-reduced-motion',
      'prefers-reduced-transparency',
      'resolution',
      'scan',
      'scripting',
      'update',
      'width',
      // TODO: find a better solution?
      'min-width',
      'max-width',
      'min-height',
      'max-height'
    ];
  
    // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
    const PSEUDO_CLASSES = [
      'active',
      'any-link',
      'blank',
      'checked',
      'current',
      'default',
      'defined',
      'dir', // dir()
      'disabled',
      'drop',
      'empty',
      'enabled',
      'first',
      'first-child',
      'first-of-type',
      'fullscreen',
      'future',
      'focus',
      'focus-visible',
      'focus-within',
      'has', // has()
      'host', // host or host()
      'host-context', // host-context()
      'hover',
      'indeterminate',
      'in-range',
      'invalid',
      'is', // is()
      'lang', // lang()
      'last-child',
      'last-of-type',
      'left',
      'link',
      'local-link',
      'not', // not()
      'nth-child', // nth-child()
      'nth-col', // nth-col()
      'nth-last-child', // nth-last-child()
      'nth-last-col', // nth-last-col()
      'nth-last-of-type', //nth-last-of-type()
      'nth-of-type', //nth-of-type()
      'only-child',
      'only-of-type',
      'optional',
      'out-of-range',
      'past',
      'placeholder-shown',
      'read-only',
      'read-write',
      'required',
      'right',
      'root',
      'scope',
      'target',
      'target-within',
      'user-invalid',
      'valid',
      'visited',
      'where' // where()
    ];
  
    // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements
    const PSEUDO_ELEMENTS = [
      'after',
      'backdrop',
      'before',
      'cue',
      'cue-region',
      'first-letter',
      'first-line',
      'grammar-error',
      'marker',
      'part',
      'placeholder',
      'selection',
      'slotted',
      'spelling-error'
    ];
  
    const ATTRIBUTES = [
      'align-content',
      'align-items',
      'align-self',
      'all',
      'animation',
      'animation-delay',
      'animation-direction',
      'animation-duration',
      'animation-fill-mode',
      'animation-iteration-count',
      'animation-name',
      'animation-play-state',
      'animation-timing-function',
      'backface-visibility',
      'background',
      'background-attachment',
      'background-blend-mode',
      'background-clip',
      'background-color',
      'background-image',
      'background-origin',
      'background-position',
      'background-repeat',
      'background-size',
      'block-size',
      'border',
      'border-block',
      'border-block-color',
      'border-block-end',
      'border-block-end-color',
      'border-block-end-style',
      'border-block-end-width',
      'border-block-start',
      'border-block-start-color',
      'border-block-start-style',
      'border-block-start-width',
      'border-block-style',
      'border-block-width',
      'border-bottom',
      'border-bottom-color',
      'border-bottom-left-radius',
      'border-bottom-right-radius',
      'border-bottom-style',
      'border-bottom-width',
      'border-collapse',
      'border-color',
      'border-image',
      'border-image-outset',
      'border-image-repeat',
      'border-image-slice',
      'border-image-source',
      'border-image-width',
      'border-inline',
      'border-inline-color',
      'border-inline-end',
      'border-inline-end-color',
      'border-inline-end-style',
      'border-inline-end-width',
      'border-inline-start',
      'border-inline-start-color',
      'border-inline-start-style',
      'border-inline-start-width',
      'border-inline-style',
      'border-inline-width',
      'border-left',
      'border-left-color',
      'border-left-style',
      'border-left-width',
      'border-radius',
      'border-right',
      'border-right-color',
      'border-right-style',
      'border-right-width',
      'border-spacing',
      'border-style',
      'border-top',
      'border-top-color',
      'border-top-left-radius',
      'border-top-right-radius',
      'border-top-style',
      'border-top-width',
      'border-width',
      'bottom',
      'box-decoration-break',
      'box-shadow',
      'box-sizing',
      'break-after',
      'break-before',
      'break-inside',
      'caption-side',
      'caret-color',
      'clear',
      'clip',
      'clip-path',
      'clip-rule',
      'color',
      'column-count',
      'column-fill',
      'column-gap',
      'column-rule',
      'column-rule-color',
      'column-rule-style',
      'column-rule-width',
      'column-span',
      'column-width',
      'columns',
      'contain',
      'content',
      'content-visibility',
      'counter-increment',
      'counter-reset',
      'cue',
      'cue-after',
      'cue-before',
      'cursor',
      'direction',
      'display',
      'empty-cells',
      'filter',
      'flex',
      'flex-basis',
      'flex-direction',
      'flex-flow',
      'flex-grow',
      'flex-shrink',
      'flex-wrap',
      'float',
      'flow',
      'font',
      'font-display',
      'font-family',
      'font-feature-settings',
      'font-kerning',
      'font-language-override',
      'font-size',
      'font-size-adjust',
      'font-smoothing',
      'font-stretch',
      'font-style',
      'font-synthesis',
      'font-variant',
      'font-variant-caps',
      'font-variant-east-asian',
      'font-variant-ligatures',
      'font-variant-numeric',
      'font-variant-position',
      'font-variation-settings',
      'font-weight',
      'gap',
      'glyph-orientation-vertical',
      'grid',
      'grid-area',
      'grid-auto-columns',
      'grid-auto-flow',
      'grid-auto-rows',
      'grid-column',
      'grid-column-end',
      'grid-column-start',
      'grid-gap',
      'grid-row',
      'grid-row-end',
      'grid-row-start',
      'grid-template',
      'grid-template-areas',
      'grid-template-columns',
      'grid-template-rows',
      'hanging-punctuation',
      'height',
      'hyphens',
      'icon',
      'image-orientation',
      'image-rendering',
      'image-resolution',
      'ime-mode',
      'inline-size',
      'isolation',
      'justify-content',
      'left',
      'letter-spacing',
      'line-break',
      'line-height',
      'list-style',
      'list-style-image',
      'list-style-position',
      'list-style-type',
      'margin',
      'margin-block',
      'margin-block-end',
      'margin-block-start',
      'margin-bottom',
      'margin-inline',
      'margin-inline-end',
      'margin-inline-start',
      'margin-left',
      'margin-right',
      'margin-top',
      'marks',
      'mask',
      'mask-border',
      'mask-border-mode',
      'mask-border-outset',
      'mask-border-repeat',
      'mask-border-slice',
      'mask-border-source',
      'mask-border-width',
      'mask-clip',
      'mask-composite',
      'mask-image',
      'mask-mode',
      'mask-origin',
      'mask-position',
      'mask-repeat',
      'mask-size',
      'mask-type',
      'max-block-size',
      'max-height',
      'max-inline-size',
      'max-width',
      'min-block-size',
      'min-height',
      'min-inline-size',
      'min-width',
      'mix-blend-mode',
      'nav-down',
      'nav-index',
      'nav-left',
      'nav-right',
      'nav-up',
      'none',
      'normal',
      'object-fit',
      'object-position',
      'opacity',
      'order',
      'orphans',
      'outline',
      'outline-color',
      'outline-offset',
      'outline-style',
      'outline-width',
      'overflow',
      'overflow-wrap',
      'overflow-x',
      'overflow-y',
      'padding',
      'padding-block',
      'padding-block-end',
      'padding-block-start',
      'padding-bottom',
      'padding-inline',
      'padding-inline-end',
      'padding-inline-start',
      'padding-left',
      'padding-right',
      'padding-top',
      'page-break-after',
      'page-break-before',
      'page-break-inside',
      'pause',
      'pause-after',
      'pause-before',
      'perspective',
      'perspective-origin',
      'pointer-events',
      'position',
      'quotes',
      'resize',
      'rest',
      'rest-after',
      'rest-before',
      'right',
      'row-gap',
      'scroll-margin',
      'scroll-margin-block',
      'scroll-margin-block-end',
      'scroll-margin-block-start',
      'scroll-margin-bottom',
      'scroll-margin-inline',
      'scroll-margin-inline-end',
      'scroll-margin-inline-start',
      'scroll-margin-left',
      'scroll-margin-right',
      'scroll-margin-top',
      'scroll-padding',
      'scroll-padding-block',
      'scroll-padding-block-end',
      'scroll-padding-block-start',
      'scroll-padding-bottom',
      'scroll-padding-inline',
      'scroll-padding-inline-end',
      'scroll-padding-inline-start',
      'scroll-padding-left',
      'scroll-padding-right',
      'scroll-padding-top',
      'scroll-snap-align',
      'scroll-snap-stop',
      'scroll-snap-type',
      'scrollbar-color',
      'scrollbar-gutter',
      'scrollbar-width',
      'shape-image-threshold',
      'shape-margin',
      'shape-outside',
      'speak',
      'speak-as',
      'src', // @font-face
      'tab-size',
      'table-layout',
      'text-align',
      'text-align-all',
      'text-align-last',
      'text-combine-upright',
      'text-decoration',
      'text-decoration-color',
      'text-decoration-line',
      'text-decoration-style',
      'text-emphasis',
      'text-emphasis-color',
      'text-emphasis-position',
      'text-emphasis-style',
      'text-indent',
      'text-justify',
      'text-orientation',
      'text-overflow',
      'text-rendering',
      'text-shadow',
      'text-transform',
      'text-underline-position',
      'top',
      'transform',
      'transform-box',
      'transform-origin',
      'transform-style',
      'transition',
      'transition-delay',
      'transition-duration',
      'transition-property',
      'transition-timing-function',
      'unicode-bidi',
      'vertical-align',
      'visibility',
      'voice-balance',
      'voice-duration',
      'voice-family',
      'voice-pitch',
      'voice-range',
      'voice-rate',
      'voice-stress',
      'voice-volume',
      'white-space',
      'widows',
      'width',
      'will-change',
      'word-break',
      'word-spacing',
      'word-wrap',
      'writing-mode',
      'z-index'
      // reverse makes sure longer attributes `font-weight` are matched fully
      // instead of getting false positives on say `font`
    ].reverse();
  
    /*
    Language: CSS
    Category: common, css, web
    Website: https://developer.mozilla.org/en-US/docs/Web/CSS
    */
  
    /** @type LanguageFn */
    function css(hljs) {
      const regex = hljs.regex;
      const modes = MODES(hljs);
      const VENDOR_PREFIX = { begin: /-(webkit|moz|ms|o)-(?=[a-z])/ };
      const AT_MODIFIERS = "and or not only";
      const AT_PROPERTY_RE = /@-?\w[\w]*(-\w+)*/; // @-webkit-keyframes
      const IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
      const STRINGS = [
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE
      ];
  
      return {
        name: 'CSS',
        case_insensitive: true,
        illegal: /[=|'\$]/,
        keywords: { keyframePosition: "from to" },
        classNameAliases: {
          // for visual continuity with `tag {}` and because we
          // don't have a great class for this?
          keyframePosition: "selector-tag" },
        contains: [
          modes.BLOCK_COMMENT,
          VENDOR_PREFIX,
          // to recognize keyframe 40% etc which are outside the scope of our
          // attribute value mode
          modes.CSS_NUMBER_MODE,
          {
            className: 'selector-id',
            begin: /#[A-Za-z0-9_-]+/,
            relevance: 0
          },
          {
            className: 'selector-class',
            begin: '\\.' + IDENT_RE,
            relevance: 0
          },
          modes.ATTRIBUTE_SELECTOR_MODE,
          {
            className: 'selector-pseudo',
            variants: [
              { begin: ':(' + PSEUDO_CLASSES.join('|') + ')' },
              { begin: ':(:)?(' + PSEUDO_ELEMENTS.join('|') + ')' }
            ]
          },
          // we may actually need this (12/2020)
          // { // pseudo-selector params
          //   begin: /\(/,
          //   end: /\)/,
          //   contains: [ hljs.CSS_NUMBER_MODE ]
          // },
          modes.CSS_VARIABLE,
          {
            className: 'attribute',
            begin: '\\b(' + ATTRIBUTES.join('|') + ')\\b'
          },
          // attribute values
          {
            begin: /:/,
            end: /[;}{]/,
            contains: [
              modes.BLOCK_COMMENT,
              modes.HEXCOLOR,
              modes.IMPORTANT,
              modes.CSS_NUMBER_MODE,
              ...STRINGS,
              // needed to highlight these as strings and to avoid issues with
              // illegal characters that might be inside urls that would tigger the
              // languages illegal stack
              {
                begin: /(url|data-uri)\(/,
                end: /\)/,
                relevance: 0, // from keywords
                keywords: { built_in: "url data-uri" },
                contains: [
                  ...STRINGS,
                  {
                    className: "string",
                    // any character other than `)` as in `url()` will be the start
                    // of a string, which ends with `)` (from the parent mode)
                    begin: /[^)]/,
                    endsWithParent: true,
                    excludeEnd: true
                  }
                ]
              },
              modes.FUNCTION_DISPATCH
            ]
          },
          {
            begin: regex.lookahead(/@/),
            end: '[{;]',
            relevance: 0,
            illegal: /:/, // break on Less variables @var: ...
            contains: [
              {
                className: 'keyword',
                begin: AT_PROPERTY_RE
              },
              {
                begin: /\s/,
                endsWithParent: true,
                excludeEnd: true,
                relevance: 0,
                keywords: {
                  $pattern: /[a-z-]+/,
                  keyword: AT_MODIFIERS,
                  attribute: MEDIA_FEATURES.join(" ")
                },
                contains: [
                  {
                    begin: /[a-z-]+(?=:)/,
                    className: "attribute"
                  },
                  ...STRINGS,
                  modes.CSS_NUMBER_MODE
                ]
              }
            ]
          },
          {
            className: 'selector-tag',
            begin: '\\b(' + TAGS.join('|') + ')\\b'
          }
        ]
      };
    }
  
    /*
    Language: SCSS
    Description: Scss is an extension of the syntax of CSS.
    Author: Kurt Emch <kurt@kurtemch.com>
    Website: https://sass-lang.com
    Category: common, css, web
    */
  
    /** @type LanguageFn */
    function scss(hljs) {
      const modes = MODES(hljs);
      const PSEUDO_ELEMENTS$1 = PSEUDO_ELEMENTS;
      const PSEUDO_CLASSES$1 = PSEUDO_CLASSES;
  
      const AT_IDENTIFIER = '@[a-z-]+'; // @font-face
      const AT_MODIFIERS = "and or not only";
      const IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
      const VARIABLE = {
        className: 'variable',
        begin: '(\\$' + IDENT_RE + ')\\b',
        relevance: 0
      };
  
      return {
        name: 'SCSS',
        case_insensitive: true,
        illegal: '[=/|\']',
        contains: [
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          // to recognize keyframe 40% etc which are outside the scope of our
          // attribute value mode
          modes.CSS_NUMBER_MODE,
          {
            className: 'selector-id',
            begin: '#[A-Za-z0-9_-]+',
            relevance: 0
          },
          {
            className: 'selector-class',
            begin: '\\.[A-Za-z0-9_-]+',
            relevance: 0
          },
          modes.ATTRIBUTE_SELECTOR_MODE,
          {
            className: 'selector-tag',
            begin: '\\b(' + TAGS.join('|') + ')\\b',
            // was there, before, but why?
            relevance: 0
          },
          {
            className: 'selector-pseudo',
            begin: ':(' + PSEUDO_CLASSES$1.join('|') + ')'
          },
          {
            className: 'selector-pseudo',
            begin: ':(:)?(' + PSEUDO_ELEMENTS$1.join('|') + ')'
          },
          VARIABLE,
          { // pseudo-selector params
            begin: /\(/,
            end: /\)/,
            contains: [ modes.CSS_NUMBER_MODE ]
          },
          modes.CSS_VARIABLE,
          {
            className: 'attribute',
            begin: '\\b(' + ATTRIBUTES.join('|') + ')\\b'
          },
          { begin: '\\b(whitespace|wait|w-resize|visible|vertical-text|vertical-ideographic|uppercase|upper-roman|upper-alpha|underline|transparent|top|thin|thick|text|text-top|text-bottom|tb-rl|table-header-group|table-footer-group|sw-resize|super|strict|static|square|solid|small-caps|separate|se-resize|scroll|s-resize|rtl|row-resize|ridge|right|repeat|repeat-y|repeat-x|relative|progress|pointer|overline|outside|outset|oblique|nowrap|not-allowed|normal|none|nw-resize|no-repeat|no-drop|newspaper|ne-resize|n-resize|move|middle|medium|ltr|lr-tb|lowercase|lower-roman|lower-alpha|loose|list-item|line|line-through|line-edge|lighter|left|keep-all|justify|italic|inter-word|inter-ideograph|inside|inset|inline|inline-block|inherit|inactive|ideograph-space|ideograph-parenthesis|ideograph-numeric|ideograph-alpha|horizontal|hidden|help|hand|groove|fixed|ellipsis|e-resize|double|dotted|distribute|distribute-space|distribute-letter|distribute-all-lines|disc|disabled|default|decimal|dashed|crosshair|collapse|col-resize|circle|char|center|capitalize|break-word|break-all|bottom|both|bolder|bold|block|bidi-override|below|baseline|auto|always|all-scroll|absolute|table|table-cell)\\b' },
          {
            begin: /:/,
            end: /[;}{]/,
            relevance: 0,
            contains: [
              modes.BLOCK_COMMENT,
              VARIABLE,
              modes.HEXCOLOR,
              modes.CSS_NUMBER_MODE,
              hljs.QUOTE_STRING_MODE,
              hljs.APOS_STRING_MODE,
              modes.IMPORTANT,
              modes.FUNCTION_DISPATCH
            ]
          },
          // matching these here allows us to treat them more like regular CSS
          // rules so everything between the {} gets regular rule highlighting,
          // which is what we want for page and font-face
          {
            begin: '@(page|font-face)',
            keywords: {
              $pattern: AT_IDENTIFIER,
              keyword: '@page @font-face'
            }
          },
          {
            begin: '@',
            end: '[{;]',
            returnBegin: true,
            keywords: {
              $pattern: /[a-z-]+/,
              keyword: AT_MODIFIERS,
              attribute: MEDIA_FEATURES.join(" ")
            },
            contains: [
              {
                begin: AT_IDENTIFIER,
                className: "keyword"
              },
              {
                begin: /[a-z-]+(?=:)/,
                className: "attribute"
              },
              VARIABLE,
              hljs.QUOTE_STRING_MODE,
              hljs.APOS_STRING_MODE,
              modes.HEXCOLOR,
              modes.CSS_NUMBER_MODE
            ]
          },
          modes.FUNCTION_DISPATCH
        ]
      };
    }
  
    /*
    Language: Bash
    Author: vah <vahtenberg@gmail.com>
    Contributrors: Benjamin Pannell <contact@sierrasoftworks.com>
    Website: https://www.gnu.org/software/bash/
    Category: common
    */
  
    /** @type LanguageFn */
    function bash(hljs) {
      const regex = hljs.regex;
      const VAR = {};
      const BRACED_VAR = {
        begin: /\$\{/,
        end: /\}/,
        contains: [
          "self",
          {
            begin: /:-/,
            contains: [ VAR ]
          } // default values
        ]
      };
      Object.assign(VAR, {
        className: 'variable',
        variants: [
          { begin: regex.concat(/\$[\w\d#@][\w\d_]*/,
            // negative look-ahead tries to avoid matching patterns that are not
            // Perl at all like $ident$, @ident@, etc.
            `(?![\\w\\d])(?![$])`) },
          BRACED_VAR
        ]
      });
  
      const SUBST = {
        className: 'subst',
        begin: /\$\(/,
        end: /\)/,
        contains: [ hljs.BACKSLASH_ESCAPE ]
      };
      const HERE_DOC = {
        begin: /<<-?\s*(?=\w+)/,
        starts: { contains: [
          hljs.END_SAME_AS_BEGIN({
            begin: /(\w+)/,
            end: /(\w+)/,
            className: 'string'
          })
        ] }
      };
      const QUOTE_STRING = {
        className: 'string',
        begin: /"/,
        end: /"/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          VAR,
          SUBST
        ]
      };
      SUBST.contains.push(QUOTE_STRING);
      const ESCAPED_QUOTE = {
        className: '',
        begin: /\\"/
  
      };
      const APOS_STRING = {
        className: 'string',
        begin: /'/,
        end: /'/
      };
      const ARITHMETIC = {
        begin: /\$?\(\(/,
        end: /\)\)/,
        contains: [
          {
            begin: /\d+#[0-9a-f]+/,
            className: "number"
          },
          hljs.NUMBER_MODE,
          VAR
        ]
      };
      const SH_LIKE_SHELLS = [
        "fish",
        "bash",
        "zsh",
        "sh",
        "csh",
        "ksh",
        "tcsh",
        "dash",
        "scsh",
      ];
      const KNOWN_SHEBANG = hljs.SHEBANG({
        binary: `(${SH_LIKE_SHELLS.join("|")})`,
        relevance: 10
      });
      const FUNCTION = {
        className: 'function',
        begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
        returnBegin: true,
        contains: [ hljs.inherit(hljs.TITLE_MODE, { begin: /\w[\w\d_]*/ }) ],
        relevance: 0
      };
  
      const KEYWORDS = [
        "if",
        "then",
        "else",
        "elif",
        "fi",
        "for",
        "while",
        "until",
        "in",
        "do",
        "done",
        "case",
        "esac",
        "function",
        "select"
      ];
  
      const LITERALS = [
        "true",
        "false"
      ];
  
      // to consume paths to prevent keyword matches inside them
      const PATH_MODE = { match: /(\/[a-z._-]+)+/ };
  
      // http://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
      const SHELL_BUILT_INS = [
        "break",
        "cd",
        "continue",
        "eval",
        "exec",
        "exit",
        "export",
        "getopts",
        "hash",
        "pwd",
        "readonly",
        "return",
        "shift",
        "test",
        "times",
        "trap",
        "umask",
        "unset"
      ];
  
      const BASH_BUILT_INS = [
        "alias",
        "bind",
        "builtin",
        "caller",
        "command",
        "declare",
        "echo",
        "enable",
        "help",
        "let",
        "local",
        "logout",
        "mapfile",
        "printf",
        "read",
        "readarray",
        "source",
        "type",
        "typeset",
        "ulimit",
        "unalias"
      ];
  
      const ZSH_BUILT_INS = [
        "autoload",
        "bg",
        "bindkey",
        "bye",
        "cap",
        "chdir",
        "clone",
        "comparguments",
        "compcall",
        "compctl",
        "compdescribe",
        "compfiles",
        "compgroups",
        "compquote",
        "comptags",
        "comptry",
        "compvalues",
        "dirs",
        "disable",
        "disown",
        "echotc",
        "echoti",
        "emulate",
        "fc",
        "fg",
        "float",
        "functions",
        "getcap",
        "getln",
        "history",
        "integer",
        "jobs",
        "kill",
        "limit",
        "log",
        "noglob",
        "popd",
        "print",
        "pushd",
        "pushln",
        "rehash",
        "sched",
        "setcap",
        "setopt",
        "stat",
        "suspend",
        "ttyctl",
        "unfunction",
        "unhash",
        "unlimit",
        "unsetopt",
        "vared",
        "wait",
        "whence",
        "where",
        "which",
        "zcompile",
        "zformat",
        "zftp",
        "zle",
        "zmodload",
        "zparseopts",
        "zprof",
        "zpty",
        "zregexparse",
        "zsocket",
        "zstyle",
        "ztcp"
      ];
  
      const GNU_CORE_UTILS = [
        "chcon",
        "chgrp",
        "chown",
        "chmod",
        "cp",
        "dd",
        "df",
        "dir",
        "dircolors",
        "ln",
        "ls",
        "mkdir",
        "mkfifo",
        "mknod",
        "mktemp",
        "mv",
        "realpath",
        "rm",
        "rmdir",
        "shred",
        "sync",
        "touch",
        "truncate",
        "vdir",
        "b2sum",
        "base32",
        "base64",
        "cat",
        "cksum",
        "comm",
        "csplit",
        "cut",
        "expand",
        "fmt",
        "fold",
        "head",
        "join",
        "md5sum",
        "nl",
        "numfmt",
        "od",
        "paste",
        "ptx",
        "pr",
        "sha1sum",
        "sha224sum",
        "sha256sum",
        "sha384sum",
        "sha512sum",
        "shuf",
        "sort",
        "split",
        "sum",
        "tac",
        "tail",
        "tr",
        "tsort",
        "unexpand",
        "uniq",
        "wc",
        "arch",
        "basename",
        "chroot",
        "date",
        "dirname",
        "du",
        "echo",
        "env",
        "expr",
        "factor",
        // "false", // keyword literal already
        "groups",
        "hostid",
        "id",
        "link",
        "logname",
        "nice",
        "nohup",
        "nproc",
        "pathchk",
        "pinky",
        "printenv",
        "printf",
        "pwd",
        "readlink",
        "runcon",
        "seq",
        "sleep",
        "stat",
        "stdbuf",
        "stty",
        "tee",
        "test",
        "timeout",
        // "true", // keyword literal already
        "tty",
        "uname",
        "unlink",
        "uptime",
        "users",
        "who",
        "whoami",
        "yes"
      ];
  
      return {
        name: 'Bash',
        aliases: [ 'sh' ],
        keywords: {
          $pattern: /\b[a-z][a-z0-9._-]+\b/,
          keyword: KEYWORDS,
          literal: LITERALS,
          built_in: [
            ...SHELL_BUILT_INS,
            ...BASH_BUILT_INS,
            // Shell modifiers
            "set",
            "shopt",
            ...ZSH_BUILT_INS,
            ...GNU_CORE_UTILS
          ]
        },
        contains: [
          KNOWN_SHEBANG, // to catch known shells and boost relevancy
          hljs.SHEBANG(), // to catch unknown shells but still highlight the shebang
          FUNCTION,
          ARITHMETIC,
          hljs.HASH_COMMENT_MODE,
          HERE_DOC,
          PATH_MODE,
          QUOTE_STRING,
          ESCAPED_QUOTE,
          APOS_STRING,
          VAR
        ]
      };
    }
  
    /*
    Language: PowerShell
    Description: PowerShell is a task-based command-line shell and scripting language built on .NET.
    Author: David Mohundro <david@mohundro.com>
    Contributors: Nicholas Blumhardt <nblumhardt@nblumhardt.com>, Victor Zhou <OiCMudkips@users.noreply.github.com>, Nicolas Le Gall <contact@nlegall.fr>
    Website: https://docs.microsoft.com/en-us/powershell/
    */
  
    function powershell(hljs) {
      const TYPES = [
        "string",
        "char",
        "byte",
        "int",
        "long",
        "bool",
        "decimal",
        "single",
        "double",
        "DateTime",
        "xml",
        "array",
        "hashtable",
        "void"
      ];
  
      // https://docs.microsoft.com/en-us/powershell/scripting/developer/cmdlet/approved-verbs-for-windows-powershell-commands
      const VALID_VERBS =
        'Add|Clear|Close|Copy|Enter|Exit|Find|Format|Get|Hide|Join|Lock|'
        + 'Move|New|Open|Optimize|Pop|Push|Redo|Remove|Rename|Reset|Resize|'
        + 'Search|Select|Set|Show|Skip|Split|Step|Switch|Undo|Unlock|'
        + 'Watch|Backup|Checkpoint|Compare|Compress|Convert|ConvertFrom|'
        + 'ConvertTo|Dismount|Edit|Expand|Export|Group|Import|Initialize|'
        + 'Limit|Merge|Mount|Out|Publish|Restore|Save|Sync|Unpublish|Update|'
        + 'Approve|Assert|Build|Complete|Confirm|Deny|Deploy|Disable|Enable|Install|Invoke|'
        + 'Register|Request|Restart|Resume|Start|Stop|Submit|Suspend|Uninstall|'
        + 'Unregister|Wait|Debug|Measure|Ping|Repair|Resolve|Test|Trace|Connect|'
        + 'Disconnect|Read|Receive|Send|Write|Block|Grant|Protect|Revoke|Unblock|'
        + 'Unprotect|Use|ForEach|Sort|Tee|Where';
  
      const COMPARISON_OPERATORS =
        '-and|-as|-band|-bnot|-bor|-bxor|-casesensitive|-ccontains|-ceq|-cge|-cgt|'
        + '-cle|-clike|-clt|-cmatch|-cne|-cnotcontains|-cnotlike|-cnotmatch|-contains|'
        + '-creplace|-csplit|-eq|-exact|-f|-file|-ge|-gt|-icontains|-ieq|-ige|-igt|'
        + '-ile|-ilike|-ilt|-imatch|-in|-ine|-inotcontains|-inotlike|-inotmatch|'
        + '-ireplace|-is|-isnot|-isplit|-join|-le|-like|-lt|-match|-ne|-not|'
        + '-notcontains|-notin|-notlike|-notmatch|-or|-regex|-replace|-shl|-shr|'
        + '-split|-wildcard|-xor';
  
      const KEYWORDS = {
        $pattern: /-?[A-z\.\-]+\b/,
        keyword:
          'if else foreach return do while until elseif begin for trap data dynamicparam '
          + 'end break throw param continue finally in switch exit filter try process catch '
          + 'hidden static parameter',
        // "echo" relevance has been set to 0 to avoid auto-detect conflicts with shell transcripts
        built_in:
          'ac asnp cat cd CFS chdir clc clear clhy cli clp cls clv cnsn compare copy cp '
          + 'cpi cpp curl cvpa dbp del diff dir dnsn ebp echo|0 epal epcsv epsn erase etsn exsn fc fhx '
          + 'fl ft fw gal gbp gc gcb gci gcm gcs gdr gerr ghy gi gin gjb gl gm gmo gp gps gpv group '
          + 'gsn gsnp gsv gtz gu gv gwmi h history icm iex ihy ii ipal ipcsv ipmo ipsn irm ise iwmi '
          + 'iwr kill lp ls man md measure mi mount move mp mv nal ndr ni nmo npssc nsn nv ogv oh '
          + 'popd ps pushd pwd r rbp rcjb rcsn rd rdr ren ri rjb rm rmdir rmo rni rnp rp rsn rsnp '
          + 'rujb rv rvpa rwmi sajb sal saps sasv sbp sc scb select set shcm si sl sleep sls sort sp '
          + 'spjb spps spsv start stz sujb sv swmi tee trcm type wget where wjb write'
        // TODO: 'validate[A-Z]+' can't work in keywords
      };
  
      const TITLE_NAME_RE = /\w[\w\d]*((-)[\w\d]+)*/;
  
      const BACKTICK_ESCAPE = {
        begin: '`[\\s\\S]',
        relevance: 0
      };
  
      const VAR = {
        className: 'variable',
        variants: [
          { begin: /\$\B/ },
          {
            className: 'keyword',
            begin: /\$this/
          },
          { begin: /\$[\w\d][\w\d_:]*/ }
        ]
      };
  
      const LITERAL = {
        className: 'literal',
        begin: /\$(null|true|false)\b/
      };
  
      const QUOTE_STRING = {
        className: "string",
        variants: [
          {
            begin: /"/,
            end: /"/
          },
          {
            begin: /@"/,
            end: /^"@/
          }
        ],
        contains: [
          BACKTICK_ESCAPE,
          VAR,
          {
            className: 'variable',
            begin: /\$[A-z]/,
            end: /[^A-z]/
          }
        ]
      };
  
      const APOS_STRING = {
        className: 'string',
        variants: [
          {
            begin: /'/,
            end: /'/
          },
          {
            begin: /@'/,
            end: /^'@/
          }
        ]
      };
  
      const PS_HELPTAGS = {
        className: "doctag",
        variants: [
          /* no paramater help tags */
          { begin: /\.(synopsis|description|example|inputs|outputs|notes|link|component|role|functionality)/ },
          /* one parameter help tags */
          { begin: /\.(parameter|forwardhelptargetname|forwardhelpcategory|remotehelprunspace|externalhelp)\s+\S+/ }
        ]
      };
  
      const PS_COMMENT = hljs.inherit(
        hljs.COMMENT(null, null),
        {
          variants: [
            /* single-line comment */
            {
              begin: /#/,
              end: /$/
            },
            /* multi-line comment */
            {
              begin: /<#/,
              end: /#>/
            }
          ],
          contains: [ PS_HELPTAGS ]
        }
      );
  
      const CMDLETS = {
        className: 'built_in',
        variants: [ { begin: '('.concat(VALID_VERBS, ')+(-)[\\w\\d]+') } ]
      };
  
      const PS_CLASS = {
        className: 'class',
        beginKeywords: 'class enum',
        end: /\s*[{]/,
        excludeEnd: true,
        relevance: 0,
        contains: [ hljs.TITLE_MODE ]
      };
  
      const PS_FUNCTION = {
        className: 'function',
        begin: /function\s+/,
        end: /\s*\{|$/,
        excludeEnd: true,
        returnBegin: true,
        relevance: 0,
        contains: [
          {
            begin: "function",
            relevance: 0,
            className: "keyword"
          },
          {
            className: "title",
            begin: TITLE_NAME_RE,
            relevance: 0
          },
          {
            begin: /\(/,
            end: /\)/,
            className: "params",
            relevance: 0,
            contains: [ VAR ]
          }
          // CMDLETS
        ]
      };
  
      // Using statment, plus type, plus assembly name.
      const PS_USING = {
        begin: /using\s/,
        end: /$/,
        returnBegin: true,
        contains: [
          QUOTE_STRING,
          APOS_STRING,
          {
            className: 'keyword',
            begin: /(using|assembly|command|module|namespace|type)/
          }
        ]
      };
  
      // Comperison operators & function named parameters.
      const PS_ARGUMENTS = { variants: [
        // PS literals are pretty verbose so it's a good idea to accent them a bit.
        {
          className: 'operator',
          begin: '('.concat(COMPARISON_OPERATORS, ')\\b')
        },
        {
          className: 'literal',
          begin: /(-){1,2}[\w\d-]+/,
          relevance: 0
        }
      ] };
  
      const HASH_SIGNS = {
        className: 'selector-tag',
        begin: /@\B/,
        relevance: 0
      };
  
      // It's a very general rule so I'll narrow it a bit with some strict boundaries
      // to avoid any possible false-positive collisions!
      const PS_METHODS = {
        className: 'function',
        begin: /\[.*\]\s*[\w]+[ ]??\(/,
        end: /$/,
        returnBegin: true,
        relevance: 0,
        contains: [
          {
            className: 'keyword',
            begin: '('.concat(
              KEYWORDS.keyword.toString().replace(/\s/g, '|'
              ), ')\\b'),
            endsParent: true,
            relevance: 0
          },
          hljs.inherit(hljs.TITLE_MODE, { endsParent: true })
        ]
      };
  
      const GENTLEMANS_SET = [
        // STATIC_MEMBER,
        PS_METHODS,
        PS_COMMENT,
        BACKTICK_ESCAPE,
        hljs.NUMBER_MODE,
        QUOTE_STRING,
        APOS_STRING,
        // PS_NEW_OBJECT_TYPE,
        CMDLETS,
        VAR,
        LITERAL,
        HASH_SIGNS
      ];
  
      const PS_TYPE = {
        begin: /\[/,
        end: /\]/,
        excludeBegin: true,
        excludeEnd: true,
        relevance: 0,
        contains: [].concat(
          'self',
          GENTLEMANS_SET,
          {
            begin: "(" + TYPES.join("|") + ")",
            className: "built_in",
            relevance: 0
          },
          {
            className: 'type',
            begin: /[\.\w\d]+/,
            relevance: 0
          }
        )
      };
  
      PS_METHODS.contains.unshift(PS_TYPE);
  
      return {
        name: 'PowerShell',
        aliases: [
          "pwsh",
          "ps",
          "ps1"
        ],
        case_insensitive: true,
        keywords: KEYWORDS,
        contains: GENTLEMANS_SET.concat(
          PS_CLASS,
          PS_FUNCTION,
          PS_USING,
          PS_ARGUMENTS,
          PS_TYPE
        )
      };
    }
  
    /*
    Language: Perl
    Author: Peter Leonov <gojpeg@yandex.ru>
    Website: https://www.perl.org
    Category: common
    */
  
    /** @type LanguageFn */
    function perl(hljs) {
      const regex = hljs.regex;
      const KEYWORDS = [
        'abs',
        'accept',
        'alarm',
        'and',
        'atan2',
        'bind',
        'binmode',
        'bless',
        'break',
        'caller',
        'chdir',
        'chmod',
        'chomp',
        'chop',
        'chown',
        'chr',
        'chroot',
        'close',
        'closedir',
        'connect',
        'continue',
        'cos',
        'crypt',
        'dbmclose',
        'dbmopen',
        'defined',
        'delete',
        'die',
        'do',
        'dump',
        'each',
        'else',
        'elsif',
        'endgrent',
        'endhostent',
        'endnetent',
        'endprotoent',
        'endpwent',
        'endservent',
        'eof',
        'eval',
        'exec',
        'exists',
        'exit',
        'exp',
        'fcntl',
        'fileno',
        'flock',
        'for',
        'foreach',
        'fork',
        'format',
        'formline',
        'getc',
        'getgrent',
        'getgrgid',
        'getgrnam',
        'gethostbyaddr',
        'gethostbyname',
        'gethostent',
        'getlogin',
        'getnetbyaddr',
        'getnetbyname',
        'getnetent',
        'getpeername',
        'getpgrp',
        'getpriority',
        'getprotobyname',
        'getprotobynumber',
        'getprotoent',
        'getpwent',
        'getpwnam',
        'getpwuid',
        'getservbyname',
        'getservbyport',
        'getservent',
        'getsockname',
        'getsockopt',
        'given',
        'glob',
        'gmtime',
        'goto',
        'grep',
        'gt',
        'hex',
        'if',
        'index',
        'int',
        'ioctl',
        'join',
        'keys',
        'kill',
        'last',
        'lc',
        'lcfirst',
        'length',
        'link',
        'listen',
        'local',
        'localtime',
        'log',
        'lstat',
        'lt',
        'ma',
        'map',
        'mkdir',
        'msgctl',
        'msgget',
        'msgrcv',
        'msgsnd',
        'my',
        'ne',
        'next',
        'no',
        'not',
        'oct',
        'open',
        'opendir',
        'or',
        'ord',
        'our',
        'pack',
        'package',
        'pipe',
        'pop',
        'pos',
        'print',
        'printf',
        'prototype',
        'push',
        'q|0',
        'qq',
        'quotemeta',
        'qw',
        'qx',
        'rand',
        'read',
        'readdir',
        'readline',
        'readlink',
        'readpipe',
        'recv',
        'redo',
        'ref',
        'rename',
        'require',
        'reset',
        'return',
        'reverse',
        'rewinddir',
        'rindex',
        'rmdir',
        'say',
        'scalar',
        'seek',
        'seekdir',
        'select',
        'semctl',
        'semget',
        'semop',
        'send',
        'setgrent',
        'sethostent',
        'setnetent',
        'setpgrp',
        'setpriority',
        'setprotoent',
        'setpwent',
        'setservent',
        'setsockopt',
        'shift',
        'shmctl',
        'shmget',
        'shmread',
        'shmwrite',
        'shutdown',
        'sin',
        'sleep',
        'socket',
        'socketpair',
        'sort',
        'splice',
        'split',
        'sprintf',
        'sqrt',
        'srand',
        'stat',
        'state',
        'study',
        'sub',
        'substr',
        'symlink',
        'syscall',
        'sysopen',
        'sysread',
        'sysseek',
        'system',
        'syswrite',
        'tell',
        'telldir',
        'tie',
        'tied',
        'time',
        'times',
        'tr',
        'truncate',
        'uc',
        'ucfirst',
        'umask',
        'undef',
        'unless',
        'unlink',
        'unpack',
        'unshift',
        'untie',
        'until',
        'use',
        'utime',
        'values',
        'vec',
        'wait',
        'waitpid',
        'wantarray',
        'warn',
        'when',
        'while',
        'write',
        'x|0',
        'xor',
        'y|0'
      ];
  
      // https://perldoc.perl.org/perlre#Modifiers
      const REGEX_MODIFIERS = /[dualxmsipngr]{0,12}/; // aa and xx are valid, making max length 12
      const PERL_KEYWORDS = {
        $pattern: /[\w.]+/,
        keyword: KEYWORDS.join(" ")
      };
      const SUBST = {
        className: 'subst',
        begin: '[$@]\\{',
        end: '\\}',
        keywords: PERL_KEYWORDS
      };
      const METHOD = {
        begin: /->\{/,
        end: /\}/
        // contains defined later
      };
      const VAR = { variants: [
        { begin: /\$\d/ },
        { begin: regex.concat(
          /[$%@](\^\w\b|#\w+(::\w+)*|\{\w+\}|\w+(::\w*)*)/,
          // negative look-ahead tries to avoid matching patterns that are not
          // Perl at all like $ident$, @ident@, etc.
          `(?![A-Za-z])(?![@$%])`
        ) },
        {
          begin: /[$%@][^\s\w{]/,
          relevance: 0
        }
      ] };
      const STRING_CONTAINS = [
        hljs.BACKSLASH_ESCAPE,
        SUBST,
        VAR
      ];
      const REGEX_DELIMS = [
        /!/,
        /\//,
        /\|/,
        /\?/,
        /'/,
        /"/, // valid but infrequent and weird
        /#/ // valid but infrequent and weird
      ];
      /**
       * @param {string|RegExp} prefix
       * @param {string|RegExp} open
       * @param {string|RegExp} close
       */
      const PAIRED_DOUBLE_RE = (prefix, open, close = '\\1') => {
        const middle = (close === '\\1')
          ? close
          : regex.concat(close, open);
        return regex.concat(
          regex.concat("(?:", prefix, ")"),
          open,
          /(?:\\.|[^\\\/])*?/,
          middle,
          /(?:\\.|[^\\\/])*?/,
          close,
          REGEX_MODIFIERS
        );
      };
      /**
       * @param {string|RegExp} prefix
       * @param {string|RegExp} open
       * @param {string|RegExp} close
       */
      const PAIRED_RE = (prefix, open, close) => {
        return regex.concat(
          regex.concat("(?:", prefix, ")"),
          open,
          /(?:\\.|[^\\\/])*?/,
          close,
          REGEX_MODIFIERS
        );
      };
      const PERL_DEFAULT_CONTAINS = [
        VAR,
        hljs.HASH_COMMENT_MODE,
        hljs.COMMENT(
          /^=\w/,
          /=cut/,
          { endsWithParent: true }
        ),
        METHOD,
        {
          className: 'string',
          contains: STRING_CONTAINS,
          variants: [
            {
              begin: 'q[qwxr]?\\s*\\(',
              end: '\\)',
              relevance: 5
            },
            {
              begin: 'q[qwxr]?\\s*\\[',
              end: '\\]',
              relevance: 5
            },
            {
              begin: 'q[qwxr]?\\s*\\{',
              end: '\\}',
              relevance: 5
            },
            {
              begin: 'q[qwxr]?\\s*\\|',
              end: '\\|',
              relevance: 5
            },
            {
              begin: 'q[qwxr]?\\s*<',
              end: '>',
              relevance: 5
            },
            {
              begin: 'qw\\s+q',
              end: 'q',
              relevance: 5
            },
            {
              begin: '\'',
              end: '\'',
              contains: [ hljs.BACKSLASH_ESCAPE ]
            },
            {
              begin: '"',
              end: '"'
            },
            {
              begin: '`',
              end: '`',
              contains: [ hljs.BACKSLASH_ESCAPE ]
            },
            {
              begin: /\{\w+\}/,
              relevance: 0
            },
            {
              begin: '-?\\w+\\s*=>',
              relevance: 0
            }
          ]
        },
        {
          className: 'number',
          begin: '(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b',
          relevance: 0
        },
        { // regexp container
          begin: '(\\/\\/|' + hljs.RE_STARTERS_RE + '|\\b(split|return|print|reverse|grep)\\b)\\s*',
          keywords: 'split return print reverse grep',
          relevance: 0,
          contains: [
            hljs.HASH_COMMENT_MODE,
            {
              className: 'regexp',
              variants: [
                // allow matching common delimiters
                { begin: PAIRED_DOUBLE_RE("s|tr|y", regex.either(...REGEX_DELIMS, { capture: true })) },
                // and then paired delmis
                { begin: PAIRED_DOUBLE_RE("s|tr|y", "\\(", "\\)") },
                { begin: PAIRED_DOUBLE_RE("s|tr|y", "\\[", "\\]") },
                { begin: PAIRED_DOUBLE_RE("s|tr|y", "\\{", "\\}") }
              ],
              relevance: 2
            },
            {
              className: 'regexp',
              variants: [
                {
                  // could be a comment in many languages so do not count
                  // as relevant
                  begin: /(m|qr)\/\//,
                  relevance: 0
                },
                // prefix is optional with /regex/
                { begin: PAIRED_RE("(?:m|qr)?", /\//, /\//) },
                // allow matching common delimiters
                { begin: PAIRED_RE("m|qr", regex.either(...REGEX_DELIMS, { capture: true }), /\1/) },
                // allow common paired delmins
                { begin: PAIRED_RE("m|qr", /\(/, /\)/) },
                { begin: PAIRED_RE("m|qr", /\[/, /\]/) },
                { begin: PAIRED_RE("m|qr", /\{/, /\}/) }
              ]
            }
          ]
        },
        {
          className: 'function',
          beginKeywords: 'sub',
          end: '(\\s*\\(.*?\\))?[;{]',
          excludeEnd: true,
          relevance: 5,
          contains: [ hljs.TITLE_MODE ]
        },
        {
          begin: '-\\w\\b',
          relevance: 0
        },
        {
          begin: "^__DATA__$",
          end: "^__END__$",
          subLanguage: 'mojolicious',
          contains: [
            {
              begin: "^@@.*",
              end: "$",
              className: "comment"
            }
          ]
        }
      ];
      SUBST.contains = PERL_DEFAULT_CONTAINS;
      METHOD.contains = PERL_DEFAULT_CONTAINS;
  
      return {
        name: 'Perl',
        aliases: [
          'pl',
          'pm'
        ],
        keywords: PERL_KEYWORDS,
        contains: PERL_DEFAULT_CONTAINS
      };
    }
  
    var builtIns = /*#__PURE__*/Object.freeze({
      __proto__: null,
      grmr_qlik: qlik,
      grmr_python: python,
      grmr_r: r,
      grmr_javascript: javascript,
      grmr_json: json,
      grmr_xml: xml,
      grmr_ruby: ruby,
      grmr_yaml: yaml,
      grmr_sql: sql,
      grmr_stata: stata,
      grmr_css: css,
      grmr_scss: scss,
      grmr_bash: bash,
      grmr_powershell: powershell,
      grmr_perl: perl
    });
  
    const hljs = HighlightJS;
  
    for (const key of Object.keys(builtIns)) {
      // our builtInLanguages Rollup plugin has to use `_` to allow identifiers to be
      // compatible with `export` naming conventions, so we need to convert the
      // identifiers back into the more typical dash style that we use for language
      // naming via the API
      const languageName = key.replace("grmr_", "").replace("_", "-");
      hljs.registerLanguage(languageName, builtIns[key]);
    }
  
    return hljs;
  
  })();
  if (typeof exports === 'object' && typeof module !== 'undefined') { module.exports = hljs; };
  
  hljs.initHighlightingOnLoad();
  
  