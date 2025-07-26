// Pokemon BW/BW2 ROM Parameters
// Source: https://blog.bzl-web.com/entry/2020/09/18/235128
// All values are verified against actual ROM analysis
// Using hexadecimal literals for direct correspondence with ROM analysis tools

const romParameters = {
  "B": {
    "JPN": {
      "nazo": [0x02215F10, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A] as const,
      "vcountTimerRanges": [[0x60, 0xC79, 0xC7A]] as const
    },
    "KOR": {
      "nazo": [0x022167B0, 0x020049DA, 0x02003E96, 0x022167F6, 0x02004A2A] as const,
      "vcountTimerRanges": [[0x60, 0xC84, 0xC85]] as const
    },
    "USA": {
      "nazo": [0x02215F30, 0x02003F2A, 0x020038E6, 0x02215F76, 0x02003F7A] as const,
      "vcountTimerRanges": [[0x5F, 0xC67, 0xC69]] as const
    },
    "GER": {
      "nazo": [0x022160B0, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A] as const,
      "vcountTimerRanges": [[0x60, 0xC7B, 0xC7C]] as const
    },
    "FRA": {
      "nazo": [0x022160D0, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A] as const,
      "vcountTimerRanges": [[0x60, 0xC7E, 0xC80]] as const
    },
    "SPA": {
      "nazo": [0x02215FF0, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A] as const,
      "vcountTimerRanges": [[0x5F, 0xC77, 0xC78]] as const
    },
    "ITA": {
      "nazo": [0x02216010, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A] as const,
      "vcountTimerRanges": [[0x60, 0xC7A, 0xC7B]] as const
    }
  },
  "W": {
    "JPN": {
      "nazo": [0x02216030, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A] as const,
      "vcountTimerRanges": [[0x5F, 0xC73, 0xC74]] as const
    },
    "KOR": {
      "nazo": [0x02216050, 0x020049DA, 0x02003E96, 0x022167F6, 0x02004A2A] as const,
      "vcountTimerRanges": [[0x5F, 0xC6E, 0xC6F]] as const
    },
    "USA": {
      "nazo": [0x02216070, 0x02003F2A, 0x020038E6, 0x02215F76, 0x02003F7A] as const,
      "vcountTimerRanges": [[0x60, 0xC86, 0xC87]] as const
    },
    "GER": {
      "nazo": [0x02216070, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A] as const,
      "vcountTimerRanges": [[0x5F, 0xC70, 0xC71]] as const
    },
    "FRA": {
      "nazo": [0x02215FB0, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A] as const,
      "vcountTimerRanges": [[0x5F, 0xC6A, 0xC6B]] as const
    },
    "SPA": {
      "nazo": [0x02215FD0, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A] as const,
      "vcountTimerRanges": [[0x60, 0xC7B, 0xC7C]] as const
    },
    "ITA": {
      "nazo": [0x02215FD0, 0x02003F0A, 0x020038C6, 0x02215F56, 0x02003F5A] as const,
      "vcountTimerRanges": [[0x60, 0xC7B, 0xC7C]] as const
    }
  },
  "B2": {
    "JPN": {
      "nazo": [0x0209A8DC, 0x02039AC9, 0x021FF9B0, 0x0209A930, 0x02039B1D] as const,
      "vcountTimerRanges": [[0x82, 0x1102, 0x1108]] as const
    },
    "KOR": {
      "nazo": [0x0209A8FC, 0x02039AF5, 0x021FF9D0, 0x0209A950, 0x02039B49] as const,
      "vcountTimerRanges": [[0x81, 0x10F5, 0x10FB]] as const
    },
    "USA": {
      "nazo": [0x0209B60C, 0x0203A4D5, 0x02200750, 0x0209B660, 0x0203A529] as const,
      "vcountTimerRanges": [[0x82, 0x10EF, 0x10F4]] as const
    },
    "GER": {
      "nazo": [0x0209B62C, 0x0203A501, 0x02200770, 0x0209B680, 0x0203A555] as const,
      "vcountTimerRanges": [
        [0x81, 0x10E5, 0x10E8],
        [0x82, 0x10E9, 0x10EC]
      ] as const
    },
    "FRA": {
      "nazo": [0x0209AEE8, 0x02039DE9, 0x02200010, 0x0209AF3C, 0x02039E3D] as const,
      "vcountTimerRanges": [[0x82, 0x1102, 0x1108]] as const
    },
    "SPA": {
      "nazo": [0x0209AF28, 0x02039E15, 0x02200050, 0x0209AF7C, 0x02039E69] as const,
      "vcountTimerRanges": [[0x82, 0x10F2, 0x10F6]] as const
    },
    "ITA": {
      "nazo": [0x0209AE28, 0x02039D69, 0x021FFF50, 0x0209AE7C, 0x02039DBD] as const,
      "vcountTimerRanges": [
        [0x82, 0x1107, 0x1109],
        [0x83, 0x110A, 0x110D]
      ] as const
    }
  },
  "W2": {
    "JPN": {
      "nazo": [0x0209AE48, 0x02039D95, 0x021FFF70, 0x0209AE9C, 0x02039DE9] as const,
      "vcountTimerRanges": [[0x82, 0x10E5, 0x10ED]] as const
    },
    "KOR": {
      "nazo": [0x0209AF08, 0x02039DF9, 0x02200030, 0x0209AF5C, 0x02039E4D] as const,
      "vcountTimerRanges": [[0x81, 0x10F4, 0x10F8]] as const
    },
    "USA": {
      "nazo": [0x0209AF28, 0x02039E25, 0x02200050, 0x0209AF7C, 0x02039E79] as const,
      "vcountTimerRanges": [[0x82, 0x10EC, 0x10F0]] as const
    },
    "GER": {
      "nazo": [0x0209AEA8, 0x02039DB9, 0x021FFFD0, 0x0209AEFC, 0x02039E0D] as const,
      "vcountTimerRanges": [[0x82, 0x1101, 0x1106]] as const
    },
    "FRA": {
      "nazo": [0x0209AEC8, 0x02039DE5, 0x021FFFF0, 0x0209AF1C, 0x02039E39] as const,
      "vcountTimerRanges": [[0x82, 0x10EF, 0x10F4]] as const
    },
    "SPA": {
      "nazo": [0x0209ADE8, 0x02039D69, 0x021FFF10, 0x0209AE3C, 0x02039DBD] as const,
      "vcountTimerRanges": [
        [0x82, 0x1107, 0x1109],
        [0x83, 0x110A, 0x110D]
      ] as const
    },
    "ITA": {
      "nazo": [0x0209AE28, 0x02039D95, 0x021FFF50, 0x0209AE7C, 0x02039DE9] as const,
      "vcountTimerRanges": [[0x82, 0x10FF, 0x1104]] as const
    }
  }
} as const;

export default romParameters;
