// Pokemon BW/BW2 ROM Parameters
// Source: https://blog.bzl-web.com/entry/2020/09/18/235128
// All values are verified against actual ROM analysis
// Using hexadecimal literals for direct correspondence with ROM analysis tools

const romParameters = {
  "B": {
    "JPN": {
      "nazo": [0x02215F10, 0x0221600C, 0x0221600C, 0x02216058, 0x02216058] as const,
      "vcountTimerRanges": [[0x60, 0xC79, 0xC7A]] as const
    },
    "KOR": {
      "nazo": [0x022167B0, 0x022168AC, 0x022168AC, 0x022168F8, 0x022168F8] as const,
      "vcountTimerRanges": [[0x60, 0xC84, 0xC85]] as const
    },
    "USA": {
      "nazo": [0x022160B0, 0x022161AC, 0x022161AC, 0x022161F8, 0x022161F8] as const,
      "vcountTimerRanges": [[0x60, 0xC7B, 0xC7C]] as const
    },
    "GER": {
      "nazo": [0x02215FF0, 0x022160EC, 0x022160EC, 0x02216138, 0x02216138] as const,
      "vcountTimerRanges": [[0x5F, 0xC77, 0xC78]] as const
    },
    "FRA": {
      "nazo": [0x02216030, 0x0221612C, 0x0221612C, 0x02216178, 0x02216178] as const,
      "vcountTimerRanges": [[0x5F, 0xC73, 0xC74]] as const
    },
    "SPA": {
      "nazo": [0x02216070, 0x0221616C, 0x0221616C, 0x022161B8, 0x022161B8] as const,
      "vcountTimerRanges": [[0x60, 0xC86, 0xC87]] as const
    },
    "ITA": {
      "nazo": [0x02215FB0, 0x022160AC, 0x022160AC, 0x022160F8, 0x022160F8] as const,
      "vcountTimerRanges": [[0x5F, 0xC6A, 0xC6B]] as const
    }
  },
  "W": {
    "JPN": {
      "nazo": [0x02215F30, 0x0221602C, 0x0221602C, 0x02216078, 0x02216078] as const,
      "vcountTimerRanges": [[0x5F, 0xC67, 0xC69]] as const
    },
    "KOR": {
      "nazo": [0x022167B0, 0x022168AC, 0x022168AC, 0x022168F8, 0x022168F8] as const,
      "vcountTimerRanges": [[0x60, 0xC7B, 0xC7C]] as const
    },
    "USA": {
      "nazo": [0x022160D0, 0x022161CC, 0x022161CC, 0x02216218, 0x02216218] as const,
      "vcountTimerRanges": [[0x60, 0xC7E, 0xC80]] as const
    },
    "GER": {
      "nazo": [0x02216010, 0x0221610C, 0x0221610C, 0x02216158, 0x02216158] as const,
      "vcountTimerRanges": [[0x60, 0xC7A, 0xC7B]] as const
    },
    "FRA": {
      "nazo": [0x02216050, 0x0221614C, 0x0221614C, 0x02216198, 0x02216198] as const,
      "vcountTimerRanges": [[0x5F, 0xC6E, 0xC6F]] as const
    },
    "SPA": {
      "nazo": [0x02216070, 0x0221616C, 0x0221616C, 0x022161B8, 0x022161B8] as const,
      "vcountTimerRanges": [[0x5F, 0xC70, 0xC71]] as const
    },
    "ITA": {
      "nazo": [0x02215FD0, 0x022160CC, 0x022160CC, 0x02216118, 0x02216118] as const,
      "vcountTimerRanges": [[0x60, 0xC7B, 0xC7C]] as const
    }
  },
  "B2": {
    "JPN": {
      "nazo": [0x0209A8DC, 0x02039AC9, 0x021FF9B0, 0x021FFA04, 0x021FFA04] as const,
      "vcountTimerRanges": [[0x82, 0x1102, 0x1108]] as const
    },
    "KOR": {
      "nazo": [0x0209B60C, 0x0203A4D5, 0x02200750, 0x022007A4, 0x022007A4] as const,
      "vcountTimerRanges": [[0x82, 0x10EF, 0x10F4]] as const
    },
    "USA": {
      "nazo": [0x0209AEE8, 0x02039DE9, 0x02200010, 0x02200064, 0x02200064] as const,
      "vcountTimerRanges": [[0x82, 0x1102, 0x1108]] as const
    },
    "GER": {
      "nazo": [0x0209AE28, 0x02039D69, 0x021FFF50, 0x021FFFA4, 0x021FFFA4] as const,
      "vcountTimerRanges": [
        [0x81, 0x10E5, 0x10E8],
        [0x82, 0x10E9, 0x10EC]
      ] as const
    },
    "FRA": {
      "nazo": [0x0209AF08, 0x02039DF9, 0x02200030, 0x02200084, 0x02200084] as const,
      "vcountTimerRanges": [[0x82, 0x10F4, 0x10F8]] as const
    },
    "SPA": {
      "nazo": [0x0209AEA8, 0x02039DB9, 0x021FFFD0, 0x02200024, 0x02200024] as const,
      "vcountTimerRanges": [[0x82, 0x1101, 0x1106]] as const
    },
    "ITA": {
      "nazo": [0x0209ADE8, 0x02039D69, 0x021FFF10, 0x021FFF64, 0x021FFF64] as const,
      "vcountTimerRanges": [
        [0x82, 0x1107, 0x1109],
        [0x83, 0x1109, 0x110D]
      ] as const
    }
  },
  "W2": {
    "JPN": {
      "nazo": [0x0209A8FC, 0x02039AF5, 0x021FF9D0, 0x021FFA24, 0x021FFA24] as const,
      "vcountTimerRanges": [[0x82, 0x10F5, 0x10FB]] as const
    },
    "KOR": {
      "nazo": [0x0209B62C, 0x0203A501, 0x02200770, 0x022007C4, 0x022007C4] as const,
      "vcountTimerRanges": [[0x81, 0x10E4, 0x10E9]] as const
    },
    "USA": {
      "nazo": [0x0209AF28, 0x02039E15, 0x02200050, 0x022000A4, 0x022000A4] as const,
      "vcountTimerRanges": [[0x82, 0x10F2, 0x10F6]] as const
    },
    "GER": {
      "nazo": [0x0209AE48, 0x02039D95, 0x021FFF70, 0x021FFFC4, 0x021FFFC4] as const,
      "vcountTimerRanges": [[0x82, 0x10E5, 0x10ED]] as const
    },
    "FRA": {
      "nazo": [0x0209AF28, 0x02039E25, 0x02200050, 0x022000A4, 0x022000A4] as const,
      "vcountTimerRanges": [[0x82, 0x10EC, 0x10F0]] as const
    },
    "SPA": {
      "nazo": [0x0209AEC8, 0x02039DE5, 0x021FFFF0, 0x02200044, 0x02200044] as const,
      "vcountTimerRanges": [[0x82, 0x10EF, 0x10F4]] as const
    },
    "ITA": {
      "nazo": [0x0209AE28, 0x02039D95, 0x021FFF50, 0x021FFFA4, 0x021FFFA4] as const,
      "vcountTimerRanges": [[0x82, 0x10FF, 0x1104]] as const
    }
  }
} as const;

export default romParameters;
