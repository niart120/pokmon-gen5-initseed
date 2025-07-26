// Pokemon BW/BW2 ROM Parameters
// Source: https://blog.bzl-web.com/entry/2020/09/18/235128
// All values are verified against actual ROM analysis
// Using hexadecimal literals for direct correspondence with ROM analysis tools

const romParameters = {
  "B": {
    "JPN": {
      "nazo": [0x02215F10, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A],
      "defaultVCount": 0x60,
      "timer0Min": 0xC79,
      "timer0Max": 0xC7A
    },
    "KOR": {
      "nazo": [0x022167B0, 0x020049DA, 0x02003E96, 0x022167F6, 0x02004A2A],
      "defaultVCount": 0x60,
      "timer0Min": 0xC84,
      "timer0Max": 0xC85
    },
    "USA": {
      "nazo": [0x02215F30, 0x02003F2A, 0x020038E6, 0x02215F76, 0x02003F7A],
      "defaultVCount": 0x5F,
      "timer0Min": 0xC67,
      "timer0Max": 0xC69
    },
    "GER": {
      "nazo": [0x022160B0, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A],
      "defaultVCount": 0x60,
      "timer0Min": 0xC7B,
      "timer0Max": 0xC7C
    },
    "FRA": {
      "nazo": [0x022160D0, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A],
      "defaultVCount": 0x60,
      "timer0Min": 0xC7E,
      "timer0Max": 0xC80
    },
    "SPA": {
      "nazo": [0x02215FF0, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A],
      "defaultVCount": 0x5F,
      "timer0Min": 0xC77,
      "timer0Max": 0xC78
    },
    "ITA": {
      "nazo": [0x02216010, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A],
      "defaultVCount": 0x60,
      "timer0Min": 0xC7A,
      "timer0Max": 0xC7B
    }
  },
  "W": {
    "JPN": {
      "nazo": [0x02216030, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A],
      "defaultVCount": 0x5F,
      "timer0Min": 0xC73,
      "timer0Max": 0xC74
    },
    "KOR": {
      "nazo": [0x02216050, 0x020049DA, 0x02003E96, 0x022167F6, 0x02004A2A],
      "defaultVCount": 0x5F,
      "timer0Min": 0xC6E,
      "timer0Max": 0xC6F
    },
    "USA": {
      "nazo": [0x02216070, 0x02003F2A, 0x020038E6, 0x02215F76, 0x02003F7A],
      "defaultVCount": 0x60,
      "timer0Min": 0xC86,
      "timer0Max": 0xC87
    },
    "GER": {
      "nazo": [0x02216070, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A],
      "defaultVCount": 0x5F,
      "timer0Min": 0xC70,
      "timer0Max": 0xC71
    },
    "FRA": {
      "nazo": [0x02215FB0, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A],
      "defaultVCount": 0x5F,
      "timer0Min": 0xC6A,
      "timer0Max": 0xC6B
    },
    "SPA": {
      "nazo": [0x02215FD0, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A],
      "defaultVCount": 0x60,
      "timer0Min": 0xC7B,
      "timer0Max": 0xC7C
    },
    "ITA": {
      "nazo": [0x02215FD0, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A],
      "defaultVCount": 0x60,
      "timer0Min": 0xC7B,
      "timer0Max": 0xC7C
    }
  },
  "B2": {
    "JPN": {
      "nazo": [0x0209A8DC, 0x02039AC9, 0x021FF9B0, 0x0209A930, 0x02039B1D],
      "defaultVCount": 0x82,
      "timer0Min": 0x1102,
      "timer0Max": 0x1108
    },
    "KOR": {
      "nazo": [0x0209A8FC, 0x02039AF5, 0x021FF9D0, 0x0209A950, 0x02039B49],
      "defaultVCount": 0x82,
      "timer0Min": 0x10F5,
      "timer0Max": 0x10FB
    },
    "USA": {
      "nazo": [0x0209B60C, 0x0203A4D5, 0x02200750, 0x0209B660, 0x0203A529],
      "defaultVCount": 0x82,
      "timer0Min": 0x10EF,
      "timer0Max": 0x10F4
    },
    "GER": {
      "nazo": [0x0209B62C, 0x0203A501, 0x02200770, 0x0209B680, 0x0203A555],
      "defaultVCount": 0x81,
      "timer0Min": 0x10E4,
      "timer0Max": 0x10E9,
      "vcountOffset": [
        {
          "timer0Min": 0x10E5,
          "timer0Max": 0x10E8,
          "vcountValue": 0x81
        },
        {
          "timer0Min": 0x10E9,
          "timer0Max": 0x10EC,
          "vcountValue": 0x82
        }
      ]
    },
    "FRA": {
      "nazo": [0x0209AEE8, 0x02039DE9, 0x02200010, 0x0209AF3C, 0x02039E3D],
      "defaultVCount": 0x82,
      "timer0Min": 0x1102,
      "timer0Max": 0x1108
    },
    "SPA": {
      "nazo": [0x0209AF28, 0x02039E15, 0x02200050, 0x0209AF7C, 0x02039E69],
      "defaultVCount": 0x82,
      "timer0Min": 0x10F2,
      "timer0Max": 0x10F6
    },
    "ITA": {
      "nazo": [0x0209AE28, 0x02039D69, 0x021FFF50, 0x0209AE7C, 0x02039DBD],
      "defaultVCount": 0x82,
      "timer0Min": 0x1107,
      "timer0Max": 0x110D,
      "vcountOffset": [
        {
          "timer0Min": 0x1107,
          "timer0Max": 0x1109,
          "vcountValue": 0x82
        },
        {
          "timer0Min": 0x110A,
          "timer0Max": 0x110D,
          "vcountValue": 0x83
        }
      ]
    }
  },
  "W2": {
    "JPN": {
      "nazo": [0x0209AE48, 0x02039D95, 0x021FFF70, 0x0209AE9C, 0x02039DE9],
      "defaultVCount": 0x82,
      "timer0Min": 0x10E5,
      "timer0Max": 0x10ED
    },
    "KOR": {
      "nazo": [0x0209AF08, 0x02039DF9, 0x02200030, 0x0209AF5C, 0x02039E4D],
      "defaultVCount": 0x82,
      "timer0Min": 0x10F4,
      "timer0Max": 0x10F8
    },
    "USA": {
      "nazo": [0x0209AF28, 0x02039E25, 0x02200050, 0x0209AF7C, 0x02039E79],
      "defaultVCount": 0x82,
      "timer0Min": 0x10EC,
      "timer0Max": 0x10F0
    },
    "GER": {
      "nazo": [0x0209AEA8, 0x02039DB9, 0x021FFFD0, 0x0209AEFC, 0x02039E0D],
      "defaultVCount": 0x82,
      "timer0Min": 0x1101,
      "timer0Max": 0x1106,
      "vcountOffset": [
        {
          "timer0Min": 0x10E5,
          "timer0Max": 0x10E8,
          "vcountValue": 0x82
        },
        {
          "timer0Min": 0x10E9,
          "timer0Max": 0x10EC,
          "vcountValue": 0x83
        }
      ]
    },
    "FRA": {
      "nazo": [0x0209AEC8, 0x02039DE5, 0x021FFFF0, 0x0209AF1C, 0x02039E39],
      "defaultVCount": 0x82,
      "timer0Min": 0x10EF,
      "timer0Max": 0x10F4
    },
    "SPA": {
      "nazo": [0x0209ADE8, 0x02039D69, 0x021FFF10, 0x0209AE3C, 0x02039DBD],
      "defaultVCount": 0x82,
      "timer0Min": 0x1107,
      "timer0Max": 0x110D,
      "vcountOffset": [
        {
          "timer0Min": 0x1107,
          "timer0Max": 0x1109,
          "vcountValue": 0x82
        },
        {
          "timer0Min": 0x110A,
          "timer0Max": 0x110D,
          "vcountValue": 0x83
        }
      ]
    },
    "ITA": {
      "nazo": [0x0209AE28, 0x02039D95, 0x021FFF50, 0x0209AE7C, 0x02039DE9],
      "defaultVCount": 0x82,
      "timer0Min": 0x10FF,
      "timer0Max": 0x1104
    }
  }
} as const;

export default romParameters;
