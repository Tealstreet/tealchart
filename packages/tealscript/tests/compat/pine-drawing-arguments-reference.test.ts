import { describe, expect, it } from 'vitest';

import { createSemanticFixture } from '../helpers/semanticFixture';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: pine-v6-reference-v1.json (2026-10-03), entries[] offsets below.
// The contracts specify accepted argument types and requiredness independently
// of the implementation's builtin signatures and namespace inventory.
const contracts: readonly (readonly [number, string, string, boolean])[] = [
  [780, 'line', 'x:line!', false],
  [781, 'label', 'x:label!', false],
  [782, 'table', 'x:table!', false],
  [783, 'box', 'x:box!', false],
  [784, 'linefill', 'x:linefill!', false],
  [856, 'box.copy', 'id:box!', false],
  [
    857,
    'box.new',
    'top_left:point! bottom_right:point! border_color:C border_width:I border_style:S extend:S xloc:S bgcolor:C text:S text_size:Z text_color:C text_halign:S text_valign:S text_wrap:S text_font_family:S force_overlay:b text_formatting:T',
    false,
  ],
  [
    858,
    'box.new',
    'left:I! top:N! right:I! bottom:N! border_color:C border_width:I border_style:S extend:S xloc:S bgcolor:C text:S text_size:Z text_color:C text_halign:S text_valign:S text_wrap:S text_font_family:S force_overlay:b text_formatting:T',
    false,
  ],
  [859, 'box.delete', 'id:box!', false],
  [860, 'box.get_left', 'id:box!', false],
  [861, 'box.get_right', 'id:box!', false],
  [862, 'box.get_top', 'id:box!', false],
  [863, 'box.get_bottom', 'id:box!', false],
  [864, 'box.set_left', 'id:box! left:I!', false],
  [865, 'box.set_lefttop', 'id:box! left:I! top:N!', false],
  [866, 'box.set_right', 'id:box! right:I!', false],
  [867, 'box.set_rightbottom', 'id:box! right:I! bottom:N!', false],
  [868, 'box.set_top', 'id:box! top:N!', false],
  [869, 'box.set_bottom', 'id:box! bottom:N!', false],
  [870, 'box.set_border_color', 'id:box! color:C!', false],
  [871, 'box.set_bgcolor', 'id:box! color:C!', false],
  [872, 'box.set_border_width', 'id:box! width:I!', false],
  [873, 'box.set_border_style', 'id:box! style:S!', false],
  [874, 'box.set_extend', 'id:box! extend:S!', false],
  [875, 'box.set_xloc', 'id:box! left:I! right:I! xloc:S!', false],
  [876, 'box.set_text_font_family', 'id:box! text_font_family:S!', false],
  [877, 'box.set_text_halign', 'id:box! text_halign:S!', false],
  [878, 'box.set_text_valign', 'id:box! text_valign:S!', false],
  [879, 'box.set_text_size', 'id:box! text_size:Z!', false],
  [880, 'box.set_text', 'id:box! text:S!', false],
  [881, 'box.set_text_formatting', 'id:box! text_formatting:T!', false],
  [882, 'box.set_text_color', 'id:box! text_color:C!', false],
  [883, 'line.copy', 'id:line!', false],
  [884, 'box.set_text_wrap', 'id:box! text_wrap:S!', false],
  [885, 'line.new', 'x1:I! y1:N! x2:I! y2:N! xloc:S extend:S color:C style:S width:I force_overlay:b', false],
  [
    886,
    'line.new',
    'first_point:point! second_point:point! xloc:S extend:S color:C style:S width:I force_overlay:b',
    false,
  ],
  [887, 'line.set_x1', 'id:line! x:I!', false],
  [888, 'line.set_y1', 'id:line! y:N!', false],
  [889, 'line.set_xy1', 'id:line! x:I! y:N!', false],
  [890, 'line.set_x2', 'id:line! x:I!', false],
  [891, 'line.set_y2', 'id:line! y:N!', false],
  [892, 'line.set_xy2', 'id:line! x:I! y:N!', false],
  [893, 'line.set_xloc', 'id:line! x1:I! x2:I! xloc:S!', false],
  [894, 'line.set_extend', 'id:line! extend:S!', false],
  [895, 'line.set_color', 'id:line! color:C!', false],
  [896, 'line.set_style', 'id:line! style:S!', false],
  [897, 'line.set_width', 'id:line! width:I!', false],
  [898, 'line.delete', 'id:line!', false],
  [899, 'line.get_x1', 'id:line!', false],
  [900, 'line.get_y1', 'id:line!', false],
  [901, 'line.get_x2', 'id:line!', false],
  [902, 'line.get_y2', 'id:line!', false],
  [903, 'line.get_price', 'id:line! x:I!', false],
  [904, 'label.copy', 'id:label!', false],
  [905, 'linefill.new', 'line1:line! line2:line! color:C!', false],
  [906, 'linefill.delete', 'id:linefill!', false],
  [907, 'linefill.set_color', 'id:linefill! color:C!', false],
  [908, 'linefill.get_line1', 'id:linefill!', false],
  [909, 'linefill.get_line2', 'id:linefill!', false],
  [
    911,
    'label.new',
    'point:point! text:S xloc:S yloc:S color:C style:S textcolor:C size:Z textalign:S tooltip:S text_font_family:S force_overlay:b text_formatting:T',
    false,
  ],
  [
    912,
    'label.new',
    'x:I! y:N! text:S xloc:S yloc:S color:C style:S textcolor:C size:Z textalign:S tooltip:S text_font_family:S force_overlay:b text_formatting:T',
    false,
  ],
  [913, 'label.set_x', 'id:label! x:I!', false],
  [914, 'label.set_y', 'id:label! y:N!', false],
  [915, 'label.set_xy', 'id:label! x:I! y:N!', false],
  [916, 'label.set_xloc', 'id:label! x:I! xloc:S!', false],
  [917, 'label.set_yloc', 'id:label! yloc:S!', false],
  [918, 'label.set_text', 'id:label! text:S!', false],
  [919, 'label.set_text_formatting', 'id:label! text_formatting:T!', false],
  [920, 'label.set_text_font_family', 'id:label! text_font_family:S!', false],
  [921, 'label.set_color', 'id:label! color:C!', false],
  [922, 'label.set_style', 'id:label! style:S!', false],
  [923, 'label.set_textcolor', 'id:label! textcolor:C!', false],
  [924, 'label.set_size', 'id:label! size:Z!', false],
  [925, 'label.set_textalign', 'id:label! textalign:S!', false],
  [926, 'label.set_tooltip', 'id:label! tooltip:S!', false],
  [927, 'label.delete', 'id:label!', false],
  [928, 'label.get_x', 'id:label!', false],
  [929, 'label.get_y', 'id:label!', false],
  [930, 'label.get_text', 'id:label!', false],
  [
    1022,
    'table.new',
    'position:S! columns:I! rows:I! bgcolor:C frame_color:C frame_width:I border_color:C border_width:I force_overlay:b',
    false,
  ],
  [1023, 'table.delete', 'table_id:table!', false],
  [1024, 'table.set_position', 'table_id:table! position:S!', false],
  [1025, 'table.set_bgcolor', 'table_id:table! bgcolor:C', false],
  [1026, 'table.set_frame_color', 'table_id:table! frame_color:C', false],
  [1027, 'table.set_border_color', 'table_id:table! border_color:C', false],
  [1028, 'table.set_frame_width', 'table_id:table! frame_width:I', false],
  [1029, 'table.set_border_width', 'table_id:table! border_width:I', false],
  [
    1030,
    'table.cell',
    'table_id:table! column:I! row:I! text:S width:N height:N text_color:C text_halign:S text_valign:S text_size:Z bgcolor:C tooltip:S text_font_family:S text_formatting:T',
    false,
  ],
  [1031, 'table.cell_set_text', 'table_id:table! column:I! row:I! text:S', false],
  [1032, 'table.cell_set_text_formatting', 'table_id:table! column:I! row:I! text_formatting:T!', false],
  [1033, 'table.cell_set_text_font_family', 'table_id:table! column:I! row:I! text_font_family:S!', false],
  [1034, 'table.cell_set_tooltip', 'table_id:table! column:I! row:I! tooltip:S', false],
  [1035, 'table.cell_set_width', 'table_id:table! column:I! row:I! width:N', false],
  [1036, 'table.cell_set_height', 'table_id:table! column:I! row:I! height:N', false],
  [1037, 'table.cell_set_text_color', 'table_id:table! column:I! row:I! text_color:C', false],
  [1038, 'table.cell_set_text_halign', 'table_id:table! column:I! row:I! text_halign:S', false],
  [1039, 'table.cell_set_text_valign', 'table_id:table! column:I! row:I! text_valign:S', false],
  [1040, 'table.cell_set_text_size', 'table_id:table! column:I! row:I! text_size:Z', false],
  [1041, 'table.cell_set_bgcolor', 'table_id:table! column:I! row:I! bgcolor:C', false],
  [1042, 'table.clear', 'table_id:table! start_column:I! start_row:I! end_column:I end_row:I', false],
  [1111, 'table.merge_cells', 'table_id:table! start_column:I! start_row:I! end_column:I! end_row:I!', false],
  [1146, 'chart.point.from_index', 'index:I! price:N!', false],
  [1147, 'chart.point.copy', 'id:point!', false],
  [1148, 'chart.point.from_time', 'time:I! price:N!', false],
  [1149, 'chart.point.now', 'price:N', false],
  [1150, 'chart.point.new', 'time:I! index:I! price:N!', false],
  [1151, 'line.set_first_point', 'id:line! point:point!', false],
  [1152, 'line.set_second_point', 'id:line! point:point!', false],
  [1153, 'label.set_point', 'id:label! point:point!', false],
  [1154, 'box.set_top_left_point', 'id:box! point:point!', false],
  [1155, 'box.set_bottom_right_point', 'id:box! point:point!', false],
  [
    1175,
    'polyline.new',
    'points:points! curved:B closed:B xloc:S line_color:C fill_color:C line_style:S line_width:I force_overlay:b',
    false,
  ],
  [1176, 'polyline.delete', 'id:polyline!', false],
  [1195, 'box.copy', '', true],
  [1196, 'box.delete', '', true],
  [1197, 'box.get_left', '', true],
  [1198, 'box.get_right', '', true],
  [1199, 'box.get_top', '', true],
  [1200, 'box.get_bottom', '', true],
  [1201, 'box.set_left', 'left:I!', true],
  [1202, 'box.set_lefttop', 'left:I! top:N!', true],
  [1203, 'box.set_right', 'right:I!', true],
  [1204, 'box.set_rightbottom', 'right:I! bottom:N!', true],
  [1205, 'box.set_top', 'top:N!', true],
  [1206, 'box.set_bottom', 'bottom:N!', true],
  [1207, 'box.set_border_color', 'color:C!', true],
  [1208, 'box.set_bgcolor', 'color:C!', true],
  [1209, 'box.set_border_width', 'width:I!', true],
  [1210, 'box.set_border_style', 'style:S!', true],
  [1211, 'box.set_extend', 'extend:S!', true],
  [1212, 'box.set_xloc', 'left:I! right:I! xloc:S!', true],
  [1213, 'box.set_text_font_family', 'text_font_family:S!', true],
  [1214, 'box.set_text_halign', 'text_halign:S!', true],
  [1215, 'box.set_text_valign', 'text_valign:S!', true],
  [1216, 'box.set_text_size', 'text_size:Z!', true],
  [1217, 'box.set_text', 'text:S!', true],
  [1218, 'box.set_text_formatting', 'text_formatting:T!', true],
  [1219, 'box.set_text_color', 'text_color:C!', true],
  [1220, 'line.copy', '', true],
  [1221, 'box.set_text_wrap', 'text_wrap:S!', true],
  [1222, 'line.set_x1', 'x:I!', true],
  [1223, 'line.set_y1', 'y:N!', true],
  [1224, 'line.set_xy1', 'x:I! y:N!', true],
  [1225, 'line.set_x2', 'x:I!', true],
  [1226, 'line.set_y2', 'y:N!', true],
  [1227, 'line.set_xy2', 'x:I! y:N!', true],
  [1228, 'line.set_xloc', 'x1:I! x2:I! xloc:S!', true],
  [1229, 'line.set_extend', 'extend:S!', true],
  [1230, 'line.set_color', 'color:C!', true],
  [1231, 'line.set_style', 'style:S!', true],
  [1232, 'line.set_width', 'width:I!', true],
  [1233, 'line.delete', '', true],
  [1234, 'line.get_x1', '', true],
  [1235, 'line.get_y1', '', true],
  [1236, 'line.get_x2', '', true],
  [1237, 'line.get_y2', '', true],
  [1238, 'line.get_price', 'x:I!', true],
  [1239, 'label.copy', '', true],
  [1240, 'linefill.delete', '', true],
  [1241, 'linefill.set_color', 'color:C!', true],
  [1242, 'linefill.get_line1', '', true],
  [1243, 'linefill.get_line2', '', true],
  [1244, 'label.set_x', 'x:I!', true],
  [1245, 'label.set_y', 'y:N!', true],
  [1246, 'label.set_xy', 'x:I! y:N!', true],
  [1247, 'label.set_xloc', 'x:I! xloc:S!', true],
  [1248, 'label.set_yloc', 'yloc:S!', true],
  [1249, 'label.set_text', 'text:S!', true],
  [1250, 'label.set_text_formatting', 'text_formatting:T!', true],
  [1251, 'label.set_text_font_family', 'text_font_family:S!', true],
  [1252, 'label.set_color', 'color:C!', true],
  [1253, 'label.set_style', 'style:S!', true],
  [1254, 'label.set_textcolor', 'textcolor:C!', true],
  [1255, 'label.set_size', 'size:Z!', true],
  [1256, 'label.set_textalign', 'textalign:S!', true],
  [1257, 'label.set_tooltip', 'tooltip:S!', true],
  [1258, 'label.delete', '', true],
  [1259, 'label.get_x', '', true],
  [1260, 'label.get_y', '', true],
  [1261, 'label.get_text', '', true],
  [1324, 'table.delete', '', true],
  [1325, 'table.set_position', 'position:S!', true],
  [1326, 'table.set_bgcolor', 'bgcolor:C', true],
  [1327, 'table.set_frame_color', 'frame_color:C', true],
  [1328, 'table.set_border_color', 'border_color:C', true],
  [1329, 'table.set_frame_width', 'frame_width:I', true],
  [1330, 'table.set_border_width', 'border_width:I', true],
  [
    1331,
    'table.cell',
    'column:I! row:I! text:S width:N height:N text_color:C text_halign:S text_valign:S text_size:Z bgcolor:C tooltip:S text_font_family:S text_formatting:T',
    true,
  ],
  [1332, 'table.cell_set_text', 'column:I! row:I! text:S', true],
  [1333, 'table.cell_set_text_formatting', 'column:I! row:I! text_formatting:T!', true],
  [1334, 'table.cell_set_text_font_family', 'column:I! row:I! text_font_family:S!', true],
  [1335, 'table.cell_set_tooltip', 'column:I! row:I! tooltip:S', true],
  [1336, 'table.cell_set_width', 'column:I! row:I! width:N', true],
  [1337, 'table.cell_set_height', 'column:I! row:I! height:N', true],
  [1338, 'table.cell_set_text_color', 'column:I! row:I! text_color:C', true],
  [1339, 'table.cell_set_text_halign', 'column:I! row:I! text_halign:S', true],
  [1340, 'table.cell_set_text_valign', 'column:I! row:I! text_valign:S', true],
  [1341, 'table.cell_set_text_size', 'column:I! row:I! text_size:Z', true],
  [1342, 'table.cell_set_bgcolor', 'column:I! row:I! bgcolor:C', true],
  [1343, 'table.clear', 'start_column:I! start_row:I! end_column:I end_row:I', true],
  [1411, 'table.merge_cells', 'start_column:I! start_row:I! end_column:I! end_row:I!', true],
  [1412, 'chart.point.copy', '', true],
  [1413, 'line.set_first_point', 'point:point!', true],
  [1414, 'line.set_second_point', 'point:point!', true],
  [1415, 'label.set_point', 'point:point!', true],
  [1416, 'box.set_top_left_point', 'point:point!', true],
  [1417, 'box.set_bottom_right_point', 'point:point!', true],
  [1428, 'polyline.delete', '', true],
];

const scalarTypes: Record<string, string[]> = {
  I: ['int'],
  N: ['int', 'float'],
  S: ['string'],
  Z: ['int', 'string'],
  C: ['color'],
  T: ['text_format'],
  B: ['bool'],
  b: ['bool'],
};
const setup = `a = chart.point.new(1700000000000, 2, 13)
b = chart.point.new(1700000060000, 4, -7)
lineId = line.new(a, b)
labelId = label.new(a)
boxId = box.new(a, b)
tableId = table.new(position.top_left, 3, 4)
fillId = linefill.new(lineId, line.new(2, 19, 4, -23), color.red)
points = array.from(a, b)
polylineId = polyline.new(points)`;
const references: Record<string, string> = {
  point: 'a',
  points: 'points',
  line: 'lineId',
  label: 'labelId',
  box: 'boxId',
  table: 'tableId',
  linefill: 'fillId',
  polyline: 'polylineId',
};

function literal(name: string, type: string, callee = ''): string {
  if (type === 'int') return '2';
  if (type === 'float') return '3.25';
  if (type === 'color') return 'color.red';
  if (type === 'bool') return 'true';
  if (type === 'text_format') return 'text.format_bold';
  if (name === 'xloc') return 'xloc.bar_index';
  if (name === 'yloc') return 'yloc.price';
  if (name === 'position') return 'position.top_left';
  if (name === 'extend') return 'extend.none';
  if (name.includes('style')) return callee.startsWith('label.') ? 'label.style_label_up' : 'line.style_solid';
  if (name.includes('font_family')) return 'font.family_default';
  if (name.includes('wrap')) return 'text.wrap_none';
  if (name.includes('align')) return 'text.align_center';
  if (name.includes('size')) return 'size.normal';
  return '"probe"';
}

function declaration(name: string, type: string, qualifier: string, callee: string): string {
  const value = literal(name, type, callee);
  if (qualifier === 'const') return `const ${type} candidate = ${value}`;
  if (qualifier === 'input') {
    const expression =
      type === 'text_format' ? `input.bool(true) ? ${value} : text.format_italic` : `input.${type}(${value})`;
    return `input ${type} candidate = ${expression}`;
  }
  const condition = qualifier === 'simple' ? 'syminfo.tickerid == ""' : 'bar_index == 0';
  return `${qualifier} ${type} candidate = ${condition} ? ${value} : ${value}`;
}

function parameters(contract: string) {
  return contract
    .split(' ')
    .filter(Boolean)
    .map((field) => {
      const [name, code] = field.split(':');
      return { name: name!, code: code!.replace('!', ''), required: code!.endsWith('!') };
    });
}

const parseDrawingArguments = createSemanticFixture('//@version=6\nindicator("Drawing arguments")\n', setup);

function errors(source: string) {
  return checkProgram(parseDrawingArguments(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

function call(name: string, contract: string, method: boolean, replacement?: { name: string; value?: string }): string {
  const params = parameters(contract);
  const args = params.flatMap((p) => {
    if (replacement?.name === p.name) return replacement.value === undefined ? [] : [`${p.name}=${replacement.value}`];
    if (!p.required) return [];
    const value = references[p.code] ?? literal(p.name, scalarTypes[p.code]?.[0] ?? p.code, name);
    return [`${p.name}=${value}`];
  });
  if (method)
    return `${references[name.split('.')[0] === 'chart' ? 'point' : name.split('.')[0]!]}${name.slice(name.lastIndexOf('.'))}(${args.join(', ')})`;
  return `${name}(${args.join(', ')})`;
}

// Each parameter/type/qualifier is varied independently; required arguments
// have a valid control and an omitted-argument discriminator in the same test.
describe('Official drawing argument contracts', () => {
  for (const [entry, name, contract, method] of contracts) {
    const form = method ? 'method' : 'function';
    if (method) {
      it(`${name} accepts its documented receiver [${entry}]`, () => {
        expect(errors(call(name, contract, true))).toEqual([]);
      });
    }
    for (const p of parameters(contract)) {
      const types = scalarTypes[p.code];
      if (types) {
        for (const type of types) {
          for (const qualifier of p.code === 'b' ? ['const'] : ['const', 'input', 'simple', 'series']) {
            it(`${name} ${form} ${p.name} accepts ${qualifier} ${type} [${entry}]`, () => {
              expect(
                errors(`${declaration(p.name, type, qualifier, name)}
${call(name, contract, method, { name: p.name, value: 'candidate' })}`),
              ).toEqual([]);
            });
          }
        }
      } else {
        it(`${name} ${form} ${p.name} accepts ${p.code} [${entry}]`, () => {
          expect(errors(call(name, contract, method))).toEqual([]);
        });
      }
      if (p.required && !(p.name === 'text_formatting' && [881, 919, 1032, 1218, 1250, 1333].includes(entry))) {
        it(`${name} ${form} requires ${p.name} [${entry}]`, () => {
          expect(errors(call(name, contract, method))).toEqual([]);
          expect(errors(call(name, contract, method, { name: p.name }))).not.toEqual([]);
        });
      }
    }
  }
});

describe('Documented drawing named arguments reach the runtime', () => {
  for (const method of [false, true]) {
    it(`box.set_text_size text_size updates the box in ${method ? 'method' : 'function'} form [879, 1216]`, () => {
      const result = runCompatScript(
        `//@version=6
indicator("Box text size")
id = box.new(4, 13, 1, -7, text_size=9)
${method ? 'id.set_text_size(text_size=17)' : 'box.set_text_size(id=id, text_size=17)'}`,
        { bars: compatibilityBars.slice(0, 1) },
      );
      expect(result.errors).toEqual([]);
      expect(result.drawings).toHaveLength(1);
      expect(result.drawings?.[0]).toMatchObject({
        type: 'box',
        textSize: '17',
        left: 4,
        top: 13,
        right: 1,
        bottom: -7,
      });
    });
    for (const [setter, xGetter, yGetter, entry] of [
      ['set_first_point', 'get_x1', 'get_y1', 1151],
      ['set_second_point', 'get_x2', 'get_y2', 1152],
    ] as const) {
      it(`line.${setter} point updates the endpoint in ${method ? 'method' : 'function'} form [${entry}]`, () => {
        const result = runCompatScript(
          `//@version=6
indicator("Line point names")
id = line.new(4, 13, 1, -7)
p = chart.point.new(1700000000000, 3, -23)
${method ? `id.${setter}(point=p)` : `line.${setter}(id=id, point=p)`}
plot(line.${xGetter}(id), title="x")
plot(line.${yGetter}(id), title="y")`,
          { bars: compatibilityBars.slice(0, 1) },
        );
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'x').values).toEqual([3]);
        expect(getPlot(result, 'y').values).toEqual([-23]);
      });
    }
  }
});

const refusedKinds: Record<string, string> = {
  I: '3.25',
  N: '"wrong"',
  S: '7',
  Z: '3.25',
  C: '"red"',
  T: '"bold"',
  B: '7',
  b: '7',
  point: 'lineId',
  points: 'array.from(1, 2)',
  line: 'labelId',
  label: 'boxId',
  box: 'lineId',
  table: 'lineId',
  linefill: 'lineId',
};
describe('Documented drawing closed argument types', () => {
  for (const [entry, name, contract, method] of contracts) {
    for (const p of parameters(contract)) {
      const value = refusedKinds[p.code];
      if (!value) continue;
      it(`${name} ${method ? 'method' : 'function'} ${p.name} refuses a different type [${entry}]`, () => {
        expect(errors(call(name, contract, method))).toEqual([]);
        expect(errors(call(name, contract, method, { name: p.name, value }))).not.toEqual([]);
      });
    }
  }
});

describe('Documented const force_overlay qualifier', () => {
  for (const [entry, name, contract, method] of contracts) {
    if (!parameters(contract).some((p) => p.code === 'b')) continue;
    for (const qualifier of ['input', 'simple', 'series']) {
      it(`${name} refuses ${qualifier} force_overlay [${entry}]`, () => {
        expect(errors(call(name, contract, method))).toEqual([]);
        expect(
          errors(
            `${declaration('force_overlay', 'bool', qualifier, name)}\n${call(name, contract, method, { name: 'force_overlay', value: 'candidate' })}`,
          ),
        ).not.toEqual([]);
      });
    }
  }
});
