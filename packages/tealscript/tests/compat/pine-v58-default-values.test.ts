import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BUILTIN_GLOBALS } from '../../src/builtinMetadata';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const fixtures = new URL('../../oracle-probes/', import.meta.url).pathname;
const nativeCases = [
  [
    'V58-001',
    'v58/captures/v58/consumers/v5-direct-omitted/default/attempt-v2/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-omitted/default/attempt-v2/observation-v1.json',
    '73b570e4d0716883172f9757921647f8d330e204ffeb12f257dd39781d421341',
  ],
  [
    'V58-002',
    'v58/captures/v58/consumers/v5-direct-body-frame/default/attempt-v2/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-body-frame/default/attempt-v2/observation-v1.json',
    '846bcdf486254f602ef19e50ff07a8d14a9e66dd3dbf76549a9bd4b43504b382',
  ],
  [
    'V58-003',
    'v58/captures/v58/consumers/v5-direct-independent/default/attempt-v2/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-independent/default/attempt-v2/observation-v1.json',
    'ffac56b0156301347fcf84c60fb770d4576b7b955ed7b4c1847d063e118bc45e',
  ],
  [
    'V58-004',
    'v58/captures/v58/consumers/v5-security-omitted/default/attempt-v2/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-omitted/default/attempt-v2/observation-v1.json',
    '633b9a13194f6cf483b516984c96521e8833b3921933c1252da99538823b0ad6',
  ],
  [
    'V58-005',
    'v58/captures/v58/consumers/v5-security-body-frame/default/attempt-v2/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-body-frame/default/attempt-v2/observation-v1.json',
    '713fc5202b9bba19ffdd4b3e9b40e296093583b7999d91a4d28dd8ad26b37e17',
  ],
  [
    'V58-006',
    'v58/captures/v58/consumers/v5-security-independent/default/attempt-v2/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-independent/default/attempt-v2/observation-v1.json',
    '7960c677ddd079ea297c37fb284163ca71bf331b05acd8a88ee433581874af9f',
  ],
  [
    'V58-007',
    'v58/captures/v58/consumers/v6-direct-omitted/default/attempt-v2/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-omitted/default/attempt-v2/observation-v1.json',
    '2c8e95a686d28d22effb4232d188fe5d2d7f1f4e1845be0c96ca5e946164e6ce',
  ],
  [
    'V58-008',
    'v58/captures/v58/consumers/v6-direct-body-frame/default/attempt-v2/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-body-frame/default/attempt-v2/observation-v1.json',
    '05b9e92a6bafded002239c87444ebb013a05c7cbdc07e9b3cd8ba206dfff7736',
  ],
  [
    'V58-009',
    'v58/captures/v58/consumers/v6-direct-independent/default/attempt-v2/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-independent/default/attempt-v2/observation-v1.json',
    '1469651c40da527d725ccbeba9ae7b214322a5d8b467573260b0f5ba6ddd52aa',
  ],
  [
    'V58-010',
    'v58/captures/v58/consumers/v6-security-omitted/default/attempt-v2/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-omitted/default/attempt-v2/observation-v1.json',
    'afbe0f2e365010514b0e475f8022dd2ec6267af3ba961be9de20fb5eaaef09fa',
  ],
  [
    'V58-011',
    'v58/captures/v58/consumers/v6-security-body-frame/default/attempt-v2/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-body-frame/default/attempt-v2/observation-v1.json',
    '3e76b7f8ae37febb6565e10b0f6b3bb0a2fe5022b55f860ee1860c8151476f74',
  ],
  [
    'V58-012',
    'v58/captures/v58/consumers/v6-security-independent/default/attempt-v2/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-independent/default/attempt-v2/observation-v1.json',
    '77663fde88789a2d0fb93725ebd996a014a2e687ddcbc7b184c4559d91c57dd1',
  ],
  [
    'V58-013',
    'v58/captures/v58/consumers/v5-direct-function-cum-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-function-cum-omitted/default/attempt-v1/observation-v1.json',
    '4497193cdcc8bf9bc10376506c55baef3cfb0fd094fbaa4775b65e7b727685d8',
  ],
  [
    'V58-014',
    'v58/captures/v58/consumers/v5-direct-function-sma-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-function-sma-omitted/default/attempt-v1/observation-v1.json',
    '8fad763a26ed8260f704ef1ae7efc4bc293c53a6bd637e98270a1fa1c22a9145',
  ],
  [
    'V58-015',
    'v58/captures/v58/consumers/v5-direct-method-cum-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-method-cum-omitted/default/attempt-v1/observation-v1.json',
    '5c19ddbf3a764e42b6c8cdeb159169cee36432ab444031cc90e068e7ce66c76e',
  ],
  [
    'V58-016',
    'v58/captures/v58/consumers/v5-direct-method-sma-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-method-sma-omitted/default/attempt-v1/observation-v1.json',
    '812d6b66d04f71b7f376f95e15532862742b4f13d10fb749ee3039516136abca',
  ],
  [
    'V58-017',
    'v58/captures/v58/consumers/v5-security-function-cum-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-function-cum-omitted/default/attempt-v1/observation-v1.json',
    'c7a187aacf7651da8f2b32413d7a81728dcde16676a5e89fba55fbfb6fdeedbd',
  ],
  [
    'V58-018',
    'v58/captures/v58/consumers/v5-security-function-sma-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-function-sma-omitted/default/attempt-v1/observation-v1.json',
    '5569cb4a5d14d93a519d8b6053cd8e65742d313a139d111c640678bcaeca5511',
  ],
  [
    'V58-019',
    'v58/captures/v58/consumers/v5-security-method-cum-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-method-cum-omitted/default/attempt-v1/observation-v1.json',
    'baeec827fd8785fb2fd761d6ba8e6dbb9e0e1d68546baf49851f861126e843b8',
  ],
  [
    'V58-020',
    'v58/captures/v58/consumers/v5-security-method-sma-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-method-sma-omitted/default/attempt-v1/observation-v1.json',
    '855fdac154833aa3bfea7d9569c5e953fed24fdf3f62cc995a393868b99669d3',
  ],
  [
    'V58-021',
    'v58/captures/v58/consumers/v6-direct-function-cum-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-function-cum-omitted/default/attempt-v1/observation-v1.json',
    'c0a609ebe7b7e828fc3b0dfef560af394d4c2479e47c9191e4a9b8673fe6dc31',
  ],
  [
    'V58-022',
    'v58/captures/v58/consumers/v6-direct-function-sma-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-function-sma-omitted/default/attempt-v1/observation-v1.json',
    '145a2ca396b5c01404a095f78c7f5c108d171e64b42003ad389be574a3595971',
  ],
  [
    'V58-023',
    'v58/captures/v58/consumers/v6-direct-method-cum-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-method-cum-omitted/default/attempt-v1/observation-v1.json',
    '642ca908eeacef196f77d458eee91f8c81118f17521df6a5a8f28fae3b42f3dc',
  ],
  [
    'V58-024',
    'v58/captures/v58/consumers/v6-direct-method-sma-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-method-sma-omitted/default/attempt-v1/observation-v1.json',
    '12ddd341380bec278d789d7debde780b5aa0f021e348ce869841451476a78efb',
  ],
  [
    'V58-025',
    'v58/captures/v58/consumers/v6-security-function-cum-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-function-cum-omitted/default/attempt-v1/observation-v1.json',
    '3091f3e9ae6bdee1a26a9ddc3fead9890356e4767cd96c07af6039acd47e1e13',
  ],
  [
    'V58-026',
    'v58/captures/v58/consumers/v6-security-function-sma-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-function-sma-omitted/default/attempt-v1/observation-v1.json',
    'fd84b127bffd42a9cf71e0273b5c398a48b00893f3aff0d7a9cfb3ef084777b1',
  ],
  [
    'V58-027',
    'v58/captures/v58/consumers/v6-security-method-cum-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-method-cum-omitted/default/attempt-v1/observation-v1.json',
    '5cff271e63a292a901eadab019dd829ab75a54cba8478af2552b6d0db855d88a',
  ],
  [
    'V58-028',
    'v58/captures/v58/consumers/v6-security-method-sma-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-method-sma-omitted/default/attempt-v1/observation-v1.json',
    '67698e1a969ef4511205bea0879b17dd5c26e22083151eb792f7594c3b0eb8e4',
  ],
  [
    'V58-030',
    'v58/captures/v58/consumers/v5-direct-root-function-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-root-function-twice-omitted/default/attempt-v1/observation-v1.json',
    'e5b25ef54bb51e01f6c6aa492f7dff33830c95aee8c22662c4b078bdc1dd1d49',
  ],
  [
    'V58-031',
    'v58/captures/v58/consumers/v5-direct-root-function-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-root-function-range-omitted/default/attempt-v1/observation-v1.json',
    '44ab6279954c1659fcad8dd5d35dc06f49dbb56a95a2d5f59fb81a7ca6a5f0cd',
  ],
  [
    'V58-032',
    'v58/captures/v58/consumers/v5-direct-root-method-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-root-method-twice-omitted/default/attempt-v1/observation-v1.json',
    '7382a6363510174e61ac9c3f698fdfdef0adae278f469113b0cdb705143f6a3b',
  ],
  [
    'V58-033',
    'v58/captures/v58/consumers/v5-direct-root-method-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-root-method-range-omitted/default/attempt-v1/observation-v1.json',
    'e3620243112069a3eae3c511f205d991f7126ba38df0be674b853a066d87be68',
  ],
  [
    'V58-034',
    'v58/captures/v58/consumers/v5-direct-nested-function-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-nested-function-twice-omitted/default/attempt-v1/observation-v1.json',
    'b3ad8b85f77170de0fe19465f3305d70e8a7367bb122da3b70aed9d2c7c1fcb5',
  ],
  [
    'V58-035',
    'v58/captures/v58/consumers/v5-direct-nested-function-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-nested-function-range-omitted/default/attempt-v1/observation-v1.json',
    '87cc9fe0fc0ca548558d0b3210780694b8b7d033dd2c770c421403d4e0889da3',
  ],
  [
    'V58-036',
    'v58/captures/v58/consumers/v5-direct-nested-method-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-nested-method-twice-omitted/default/attempt-v1/observation-v1.json',
    '6e1f3a198e3ad985b7de8e077b3b7fb38d16977a19a8aeff9fadc6a40fa107af',
  ],
  [
    'V58-037',
    'v58/captures/v58/consumers/v5-direct-nested-method-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-nested-method-range-omitted/default/attempt-v1/observation-v1.json',
    '621a4e69482e49063e44d4427b4f94bebfa08996b036eb9a6813cc304a99e58f',
  ],
  [
    'V58-038',
    'v58/captures/v58/consumers/v5-security-root-function-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-root-function-twice-omitted/default/attempt-v1/observation-v1.json',
    '823e0421ee0dc794a7d17926176afc9ad25bf287fd4daa0766ad16bbd06724d5',
  ],
  [
    'V58-039',
    'v58/captures/v58/consumers/v5-security-root-function-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-root-function-range-omitted/default/attempt-v1/observation-v1.json',
    'f50866828608f3bf327ec0de9a244fa7a53dfbef6c458bafa5530b060dd0440b',
  ],
  [
    'V58-040',
    'v58/captures/v58/consumers/v5-security-root-method-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-root-method-twice-omitted/default/attempt-v1/observation-v1.json',
    '4631f238a60131de733cd8c6647cd50f8c3b791ffe41e847a53a5fa7c3b4ac0b',
  ],
  [
    'V58-041',
    'v58/captures/v58/consumers/v5-security-root-method-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-root-method-range-omitted/default/attempt-v1/observation-v1.json',
    '56b72d3ba3f87a7b517fe82f0c9bdd2f02d888163662328f2d3537adc2259863',
  ],
  [
    'V58-042',
    'v58/captures/v58/consumers/v5-security-nested-function-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-nested-function-twice-omitted/default/attempt-v1/observation-v1.json',
    'ca409b00d3bd971300894710bcc0248b5892bea33ab8a391c9216adef39c78e7',
  ],
  [
    'V58-043',
    'v58/captures/v58/consumers/v5-security-nested-function-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-nested-function-range-omitted/default/attempt-v1/observation-v1.json',
    'e8b20281f6a83799f0362898759eda2a2f7de3c0a6df9a34507ed593a302f1e1',
  ],
  [
    'V58-044',
    'v58/captures/v58/consumers/v5-security-nested-method-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-nested-method-twice-omitted/default/attempt-v1/observation-v1.json',
    'a442d63f7990c56a63e32659744258c517efefa1dcf4c2240f91a0fb4c01fd33',
  ],
  [
    'V58-045',
    'v58/captures/v58/consumers/v5-security-nested-method-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-nested-method-range-omitted/default/attempt-v1/observation-v1.json',
    '031f7ba901228250f88f542dd679aba78d86e6bc2908ce11f316397d9acfcf0f',
  ],
  [
    'V58-046',
    'v58/captures/v58/consumers/v6-direct-root-function-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-root-function-twice-omitted/default/attempt-v1/observation-v1.json',
    '5658f4c63deb976f47b3ce4920fb75635d4f747976d9c6c6178ce8c03d901371',
  ],
  [
    'V58-047',
    'v58/captures/v58/consumers/v6-direct-root-function-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-root-function-range-omitted/default/attempt-v1/observation-v1.json',
    'de4b0c3412b67ec4d3c1175167a7e163744483bc6366707ae6c161cded0bc1a3',
  ],
  [
    'V58-048',
    'v58/captures/v58/consumers/v6-direct-root-method-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-root-method-twice-omitted/default/attempt-v1/observation-v1.json',
    'ef53524db77c8263799996a1b84c2ed88ab616a39850d759734917e4d2da82e9',
  ],
  [
    'V58-049',
    'v58/captures/v58/consumers/v6-direct-root-method-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-root-method-range-omitted/default/attempt-v1/observation-v1.json',
    '3e17d9621bec36c83b63c42ff667a803229bc4cf067055c91537ce8212c16277',
  ],
  [
    'V58-050',
    'v58/captures/v58/consumers/v6-direct-nested-function-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-nested-function-twice-omitted/default/attempt-v1/observation-v1.json',
    'd93b2505111384be51ca79379b9f64f755dc33ab670cbe8fa28b53615c73c46f',
  ],
  [
    'V58-051',
    'v58/captures/v58/consumers/v6-direct-nested-function-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-nested-function-range-omitted/default/attempt-v1/observation-v1.json',
    '48e1d5d78d28e1c31479553aac555760a8235144191d0e8c70b79314ae506554',
  ],
  [
    'V58-052',
    'v58/captures/v58/consumers/v6-direct-nested-method-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-nested-method-twice-omitted/default/attempt-v1/observation-v1.json',
    'bdacdbd6459c9a3b211902f2f874f591b8250a34b5d3102ab0d0a2443ece1434',
  ],
  [
    'V58-053',
    'v58/captures/v58/consumers/v6-direct-nested-method-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-nested-method-range-omitted/default/attempt-v1/observation-v1.json',
    '9df2b165026f13e72cb9e2478c66ccfcf58f69696f0f9e24f5bd5a89359d1ae9',
  ],
  [
    'V58-054',
    'v58/captures/v58/consumers/v6-security-root-function-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-root-function-twice-omitted/default/attempt-v1/observation-v1.json',
    '643d367262dd847279aa745e02047ff78795d63b83d0d53b2862e23c55d830f7',
  ],
  [
    'V58-055',
    'v58/captures/v58/consumers/v6-security-root-function-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-root-function-range-omitted/default/attempt-v1/observation-v1.json',
    '830aec1f276f6e9f51c2afa4e23188b8cc908686555fc2317b8064f450c6fbe7',
  ],
  [
    'V58-056',
    'v58/captures/v58/consumers/v6-security-root-method-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-root-method-twice-omitted/default/attempt-v1/observation-v1.json',
    '8e75a5d1fbd5cf0323fb672fd3c2019ac75cb39cac7dc6130593baffdff34eb0',
  ],
  [
    'V58-057',
    'v58/captures/v58/consumers/v6-security-root-method-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-root-method-range-omitted/default/attempt-v1/observation-v1.json',
    'd7c80cf83216aa29066d8c21605492e1b41e17092bcb70c6c5cbfac5b1eca693',
  ],
  [
    'V58-058',
    'v58/captures/v58/consumers/v6-security-nested-function-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-nested-function-twice-omitted/default/attempt-v1/observation-v1.json',
    'c1008e30dde7c9dbf338a124eeaf8cf074c674d437a25af87978cbe59e911121',
  ],
  [
    'V58-059',
    'v58/captures/v58/consumers/v6-security-nested-function-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-nested-function-range-omitted/default/attempt-v1/observation-v1.json',
    '3d7d4786329f05a7f780c5c6e257befefed0840f18c081d64ec4d9acac52ba4c',
  ],
  [
    'V58-060',
    'v58/captures/v58/consumers/v6-security-nested-method-twice-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-nested-method-twice-omitted/default/attempt-v1/observation-v1.json',
    'bd9d99f6b33fa84ad90041adb7260b807038b8465c4ef34f2516b7661f8bf6fd',
  ],
  [
    'V58-061',
    'v58/captures/v58/consumers/v6-security-nested-method-range-omitted/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-nested-method-range-omitted/default/attempt-v1/observation-v1.json',
    'c925feeb43fb850d0b6e5543ff236bdc9cd47eeb07fdc2801d5ad33d8c1a5269',
  ],
  [
    'V58-062',
    'v58/captures/v58/consumers/v5-direct-float-function-omitted-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-float-function-omitted-v1/default/attempt-v1/observation-v1.json',
    'e2d02062a4ea01c5769d9561b3dd28dcbddcebf87288388fe11cafacf12252ee',
  ],
  [
    'V58-063',
    'v58/captures/v58/consumers/v5-direct-float-function-supplied-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-float-function-supplied-v1/default/attempt-v1/observation-v1.json',
    '192581237abec3e8d886e89b365e7b0f6fabde17512f8ac45edbb48e847a37eb',
  ],
  [
    'V58-064',
    'v58/captures/v58/consumers/v5-security-float-function-omitted-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-float-function-omitted-v1/default/attempt-v1/observation-v1.json',
    'b20897066222d51138c75190abd1535949b8d6c6230c00a0a2bd6b177c39583a',
  ],
  [
    'V58-065',
    'v58/captures/v58/consumers/v5-security-float-function-supplied-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-float-function-supplied-v1/default/attempt-v1/observation-v1.json',
    '523c93e8cb954a8aa69cddfbdb970f38d9e054a3fa7bd110e9552ef2150dba1c',
  ],
  [
    'V58-066',
    'v58/captures/v58/consumers/v6-direct-float-function-omitted-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-float-function-omitted-v1/default/attempt-v1/observation-v1.json',
    '378f434a179499b9b129a7f99751105285fadc81b891029f7b0ed0d25fc9d318',
  ],
  [
    'V58-067',
    'v58/captures/v58/consumers/v6-direct-float-function-supplied-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-float-function-supplied-v1/default/attempt-v1/observation-v1.json',
    '0e45b4edbd5e98126529030aeb1bbec17e57340e082188336e81696799b43dd8',
  ],
  [
    'V58-068',
    'v58/captures/v58/consumers/v6-security-float-function-omitted-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-float-function-omitted-v1/default/attempt-v1/observation-v1.json',
    'b05d932a811a2d1530faf89523c66c814145680decacc7f50c3faf05272e37fa',
  ],
  [
    'V58-069',
    'v58/captures/v58/consumers/v6-security-float-function-supplied-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-float-function-supplied-v1/default/attempt-v1/observation-v1.json',
    '0da4b9aef31c03919ccbcfcb2aaedc176a1a94409fc23f73538572a73863c4b3',
  ],
  [
    'V58-070',
    'v58/captures/v58/consumers/v5-direct-float-method-omitted-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-float-method-omitted-v1/default/attempt-v1/observation-v1.json',
    'e175728febfe629a48b29c710d96e33e01d1159730effc45d1b2913fed21c237',
  ],
  [
    'V58-071',
    'v58/captures/v58/consumers/v5-direct-float-method-supplied-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-direct-float-method-supplied-v1/default/attempt-v1/observation-v1.json',
    '653ffd384357038818ab8fba3044ed739aadbf200bd1e10c80c12b3cf9cf4ac6',
  ],
  [
    'V58-072',
    'v58/captures/v58/consumers/v5-security-float-method-omitted-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-float-method-omitted-v1/default/attempt-v1/observation-v1.json',
    '6500868de2da860dd67238ad89dbb59d975662c2952a64b3931782a65aad403e',
  ],
  [
    'V58-073',
    'v58/captures/v58/consumers/v5-security-float-method-supplied-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v5-security-float-method-supplied-v1/default/attempt-v1/observation-v1.json',
    '25d64cc5daecee44490c65a3c1ae2c322ea6a464ec1d3877f3224c40474841b9',
  ],
  [
    'V58-074',
    'v58/captures/v58/consumers/v6-direct-float-method-omitted-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-float-method-omitted-v1/default/attempt-v1/observation-v1.json',
    'fe13c588abb9cc0a40b25eef5f67799ab00768937051eacfe28d517c0dcc1ee0',
  ],
  [
    'V58-075',
    'v58/captures/v58/consumers/v6-direct-float-method-supplied-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-direct-float-method-supplied-v1/default/attempt-v1/observation-v1.json',
    '1954f11fa9c274339ae6f6a0e202b602eed062b1de0d293f34be830002981f8b',
  ],
  [
    'V58-076',
    'v58/captures/v58/consumers/v6-security-float-method-omitted-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-float-method-omitted-v1/default/attempt-v1/observation-v1.json',
    'fb7191ab249ba23a1b4e1e7f315dd138b50d74d7e9d5d08c2f49b9ceeadb9c74',
  ],
  [
    'V58-077',
    'v58/captures/v58/consumers/v6-security-float-method-supplied-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/v6-security-float-method-supplied-v1/default/attempt-v1/observation-v1.json',
    'd23ed6d602e3a5b4b3b8dde2171d6818a1565b2b66fbdf3cb88fb79b87216511',
  ],
  [
    'V58-170',
    'v58/captures/v58/consumers/first-named-omitted-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/first-named-omitted-v1/default/attempt-v1/observation-v1.json',
    '74d7ca3b30d099196e884f8121a3c9e0d4b2beed6e9a256840c9ad313a6be3d8',
  ],
  [
    'V58-171',
    'v58/captures/v58/consumers/first-named-explicit-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/first-named-explicit-v1/default/attempt-v1/observation-v1.json',
    'ecb06a0ff39c28664c30ac4e8086f96259e1204a94edd7070022ca010b7b69b6',
  ],
  [
    'V58-172',
    'v58/captures/v58/consumers/nested-request-omitted-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/nested-request-omitted-v1/default/attempt-v1/observation-v1.json',
    'b691a64b186cdbbcaabd3bca22a614e9964129663a29124c092405e20e1da286',
  ],
  [
    'V58-173',
    'v58/captures/v58/consumers/nested-request-explicit-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/nested-request-explicit-v1/default/attempt-v1/observation-v1.json',
    '3088c856090fbd2e13cc43f0baf68633b23be853555ed5dbd18a4abf66f0e12a',
  ],
  [
    'V58-174',
    'v58/captures/v58/consumers/default-request-omitted-original-v1/default/attempt-v1/executed-v1.pine',
    'v58/captures/v58/consumers/default-request-omitted-original-v1/default/attempt-v1/observation-v1.json',
    '84704165612d3b7cd3aa5c95605b9e29c4761f25174bb7345c36ca756c800414',
  ],
] as const;

describe('native v58 default parameter validation', () => {
  for (const [id, sourcePath, observationPath, hash] of nativeCases) {
    it(`${id} refuses the exact native-invalid default header`, () => {
      const source = readFileSync(join(fixtures, sourcePath), 'utf8');
      const observation = JSON.parse(readFileSync(join(fixtures, observationPath), 'utf8'));
      expect(createHash('sha256').update(source).digest('hex')).toBe(hash);
      expect(observation.executedSha256).toBe(hash);
      expect(
        observation.markers.some((marker: { message: string }) =>
          /default value cannot|must be either a literal/.test(marker.message),
        ),
      ).toBe(true);
      expect(
        checkProgram(parse(source)).diagnostics.some(
          (diagnostic) => diagnostic.severity === 'error' && diagnostic.code === 'invalid-parameter-default',
        ),
      ).toBe(true);
    });
  }
});

const errors = (source: string) =>
  checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
const prefix = (version: number) => `//@version=${version}\nindicator("Default values")\n`;

for (const version of [5, 6]) {
  describe(`v${version} default value syntax`, () => {
    for (const [name, setup, value] of [
      ['function call', 'seed() => 4', 'seed()'],
      ['builtin call', '', 'ta.sma(close, 2)'],
      ['cast call', '', 'bool(na)'],
      ['variable', 'seed = 4', 'seed'],
      ['const variable', 'const int seed = 4', 'seed'],
      ['builtin alias', 'seed = close', 'seed'],
      ['calculation', '', '2 + 3'],
      ['negative calculation', '', '-(2 + 3)'],
      ['history', '', 'close[1]'],
      ['conditional', '', 'true ? 2 : 3'],
      ['array constructor', '', 'array.new_int(1, 4)'],
      ['UDT constructor', 'type Holder\n    int value', 'Holder.new(4)'],
      ['UDT field', 'type Holder\n    int value\nseed = Holder.new(4)', 'seed.value'],
      ['shadowed builtin', 'close = 4', 'close'],
      ['shadowed namespace', 'type Holder\n    float red\ncolor = Holder.new(4)', 'color.red'],
    ]) {
      for (const style of ['function', 'method', 'exported'] as const) {
        for (const call of ['omitted', 'supplied', 'unused'] as const) {
          if (
            style === 'exported' &&
            ['array constructor', 'UDT constructor', 'UDT field', 'shadowed namespace'].includes(name)
          )
            continue;
          it(`rejects ${name} in ${style} header with ${call} arguments`, () => {
            const declaration =
              style === 'method'
                ? `method read(int self, value = ${value}) => self`
                : style === 'exported'
                  ? `export read(float value = ${value}) => value`
                  : `read(value = ${value}) => value`;
            const invocation =
              style === 'exported' || call === 'unused'
                ? ''
                : style === 'method'
                  ? `plot(read(1${call === 'supplied' ? ', value = 4' : ''}))`
                  : `plot(read(${call === 'supplied' ? 'value = 4' : ''}))`;
            const header = style === 'exported' ? `//@version=${version}\nlibrary("DefaultValues")\n` : prefix(version);
            expect(errors(`${header}${setup}\n${declaration}\n${invocation}`)).toEqual(
              expect.arrayContaining([expect.objectContaining({ code: 'invalid-parameter-default' })]),
            );
          });
        }
      }
    }
    for (const value of ['0', '4', '4.5', '-4', '+4', '-4.5', 'true', 'false', '"value"', '#123456', '(4)', 'na']) {
      it(`preserves literal ${value}`, () => {
        const parameter = value === 'na' ? 'float value' : 'value';
        expect(errors(prefix(version) + `read(${parameter} = ${value}) => value\nplot(1)`)).toEqual([]);
      });
    }
    for (const value of [...BUILTIN_GLOBALS].filter((name) => name !== 'na')) {
      it(`preserves builtin ${value}`, () => {
        expect(errors(prefix(version) + `read(value = ${value}) => value\nplot(1)`)).toEqual([]);
      });
    }
    for (const value of [
      'color.red',
      'math.pi',
      'syminfo.mintick',
      'syminfo.tickerid',
      'barstate.isfirst',
      'timeframe.period',
      'timeframe.multiplier',
      'session.ismarket',
      'chart.fg_color',
      'dayofweek.monday',
      'position.top_right',
      'size.normal',
      'line.style_solid',
      'table.all',
    ]) {
      it(`preserves builtin member ${value}`, () => {
        expect(errors(prefix(version) + `read(value = ${value}) => value\nplot(1)`)).toEqual([]);
      });
    }
    it('preserves distinct literal and builtin defaults on functions, methods and exported headers', () => {
      for (const header of [
        'read(float value = close, float scale = -2.0) => value * scale',
        'method read(int self, float value = close, float scale = -2.0) => self + value * scale',
      ]) {
        expect(errors(prefix(version) + header + '\nplot(1)')).toEqual([]);
      }
      expect(
        errors(
          `//@version=${version}\nlibrary("Defaults")\nexport read(float value = close, float scale = -2.0) => value * scale`,
        ),
      ).toEqual([]);
    });
    for (const [namespace, binding, value] of [
      ['barstate', '4', 'barstate.isfirst'],
      ['syminfo', '"shadow"', 'syminfo.mintick'],
      ['timeframe', 'true', 'timeframe.period'],
      ['color', '4', 'color.red'],
    ]) {
      it(`preserves builtin ${value} with a scalar ${namespace} binding`, () => {
        expect(errors(prefix(version) + `${namespace} = ${binding}\nread(value = ${value}) => value\nplot(1)`)).toEqual(
          [],
        );
      });
    }
    it('preserves local enum member defaults as declared constant values', () => {
      expect(
        errors(prefix(version) + 'enum Direction\n    up\nread(Direction value = Direction.up) => value\nplot(1)'),
      ).toEqual([]);
    });
  });
}
