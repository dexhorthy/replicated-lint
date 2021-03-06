import { describe, it } from "mocha";
import { expect } from "chai";
import { lint, hackLintMultidoc } from "../lint";
import { apiVersion } from "../rules/root";

describe("mesg-yaml-valid", () => {
  describe("Passing valid yaml", () => {
    it("should return not warnings", () => {
      expect(lint("{}")).to.be.empty;
    });
  });

  const emptyCases: any[][] = [
    [undefined, [{
      type: "warn",
      rule: "mesg-yaml-not-empty",
      message: "No document provided",
    }]],
    [null, [{
      type: "warn",
      rule: "mesg-yaml-not-empty",
      message: "No document provided",
    }]],
    ["", [{
      type: "warn",
      rule: "mesg-yaml-not-empty",
      message: "No document provided",
    }]],
  ];

  emptyCases.forEach(([input, expected]) => {
    it("should return a error when passed" + input, () => {
      expect(lint(input)).to.deep.equal(expected);
    });
  });

  describe("Passing invalid yaml", () => {
    it("should return a error panic warning with the failed indices", () => {
      expect(lint(`
---
foo: }`)).to.deep.equal([{
          type: "error",
          rule: "mesg-yaml-valid",
          positions: [{
            start: {
              column: 5,
              line: 2,
              position: 10,
            },
          }],
          message: `end of the stream or a document separator is expected at line 3, column 6:\n    foo: }\n         ^`,
        }]);
    });
  });

});

describe("lintMultidoc", () => {
  it("should handle multidoc yaml", () => {
    expect(hackLintMultidoc(`---
foo: {}
---
bar: {}`)).to.deep.equal([{
        index: 0,
        findings: [],
      }, {
        index: 1,
        findings: [],
      }]);
  });
  it("should give global indices for multidoc failures", () => {
    const inYaml = `


# nothing to see here

---
foo: {}
---

# lol


---
fdfsjl: ]
---
bar: {}
`;
    expect(hackLintMultidoc(inYaml)).to.deep.equal([{
      index: 0,
      findings: [],
    }, {
      index: 1,
      findings: [{
        type: "warn",
        rule: "mesg-yaml-not-empty",
        message: "No document provided",
      }],
    }, {
      index: 2,
      findings: [
        {
          "message": "end of the stream or a document separator is expected at line 1, column 9:\n    fdfsjl: ]\n            ^",
          positions: [
            {
              start: {
                column: 8,
                line: 13,
                position: 63,
              },
            },
          ],
          rule: "mesg-yaml-valid",
          type: "error",
        },
      ],
    }, {
      index: 3,
      findings: [],
    }]);
  });
});

describe("duplicate-root-element", () => {
  it("errors if root elements are duplicated", () => {

    const inYaml = `
# Retraced

---
# kind: replicated
replicated_api_version: 2.9.0
replicated_api_version: 2.8.0
name: Retraced
`;

    expect(lint(inYaml, { rules: [apiVersion] },
    )).to.deep.equal([
      {
        "message": "duplicated mapping key at line 7, column 1:\n    replicated_api_version: 2.8.0\n    ^",
        "positions": [
          {
            "start": {
              "column": 0,
              "line": 6,
              "position": 66,
            },
          },
        ],
        "rule": "mesg-yaml-valid",
        "type": "error",
      },
    ]);
  });
});
