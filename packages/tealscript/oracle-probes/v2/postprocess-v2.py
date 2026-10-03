#!/usr/bin/env python3
"""Derive capture metadata without modifying CSVs; leave unknown observations explicit."""
import argparse,csv,hashlib,json,math,re,sys
from pathlib import Path
from datetime import datetime,timezone

def read(p):return json.loads(Path(p).read_text())
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def number(s):
    try:return float(s)
    except (TypeError,ValueError):return math.nan

def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--bundle',type=Path,default=Path(__file__).resolve().parent)
    cli.add_argument('--captures',type=Path)
    cli.add_argument('--notes',type=Path)
    cli.add_argument('--output',type=Path)
    a=cli.parse_args();a.captures=a.captures or a.bundle/'captures/v2';a.notes=a.notes or a.captures/'capture-notes-v3.json';a.output=a.output or a.captures/'manifest-v2.json'
    bundle=read(a.bundle/'bundle-manifest-v2.json');plan=read(a.bundle/'capture-plan-v3.json');rules={r['probe']:r for r in plan['numeric']+plan['outcomeOnly']}
    raw=read(a.notes) if a.notes.exists() else {'attempts':[]}
    attempts=raw.get('attempts',[]);records=[];problems=[];seen=set()
    for attempt in attempts:
        filename=attempt.get('csv_file')
        if filename:seen.add(filename)
    for r in bundle['numeric']:
        filename=Path(r['probe']).stem+'.csv'
        if (a.captures/filename).exists() and filename not in seen:attempts.append({'probe':r['probe'],'csv_file':filename})
    for note in attempts:
        if not note.get('csv_file'):continue
        probe=Path(note['probe']).name
        if probe not in rules:problems.append({'probe':probe,'error':'Unknown probe'});continue
        rule=rules[probe];source=next(r for r in bundle['numeric']+bundle['outcomeOnly'] if r['probe']==probe);file=a.captures/note['csv_file']
        try:
            with file.open(newline='',encoding='utf-8-sig') as stream:
                reader=csv.DictReader(stream);headers=reader.fieldnames;rows=list(reader)
            if not rows or not headers or len(headers)!=len(set(headers)):raise ValueError('Empty rows or duplicate/missing headers')
            if any(None in row or any(v is None for v in row.values()) for row in rows):raise ValueError('Malformed row width')
            mappings=dict(note.get('column_map') or {});validation=[]
            for c in rule['columns']:
                if c.get('channel'):continue
                hits=[h for h in headers if h.endswith(': '+c['title'])]
                if not hits:hits=[h for h in headers if h==c['title']]
                if len(hits)==1:mappings.setdefault(hits[0],{'title':c['title']})
            by_key={((v if isinstance(v,str) else v.get('title',v.get('plotTitle'))),None if isinstance(v,str) else v.get('channel',v.get('ohlcChannel'))):h for h,v in mappings.items()}
            missing=[c for c in rule['columns'] if (c['title'],c.get('channel')) not in by_key]
            if missing:validation.append('Missing mapped output columns: '+str(missing))
            input_columns=dict(note.get('input_columns') or {})
            for key in ['time','open','high','low','close','volume']:
                hits=[h for h in headers if h.lower()==key]
                if len(hits)==1:input_columns.setdefault(key,hits[0])
                elif key=='volume':
                    hits=[by_key[(t,None)] for t in ['input_volume','volume'] if (t,None) in by_key]
                    if len(hits)==1:input_columns.setdefault(key,hits[0])
            time_header=input_columns.get('time')
            if not time_header:raise ValueError('Raw chart timestamp header missing')
            rawtimes=[number(row[time_header]) for row in rows]
            if not all(math.isfinite(t) for t in rawtimes):raise ValueError('Non-numeric UNIX timestamps; export UNIX format')
            unit=note.get('csv_time_unit','seconds')
            factor=1000 if unit=='seconds' else 1 if unit=='milliseconds' else None
            if factor is None:raise ValueError('csv_time_unit must be seconds or milliseconds')
            timestamps=[t*factor/1000 for t in rawtimes]
            if any(timestamps[i]<=timestamps[i-1] for i in range(1,len(rows))):validation.append('Non-increasing chart timestamps')
            cutoff=note.get('live_cutoff_unix_seconds')
            if cutoff is None and note.get('live_bar_open_utc'):
                parsed=datetime.fromisoformat(note['live_bar_open_utc'].replace('Z','+00:00'))
                if parsed.tzinfo is None:raise ValueError('Observed live bar UTC timestamp must include Z or offset')
                cutoff=parsed.timestamp()
            if cutoff is None:cutoff=timestamps[-1];cutoff_basis='Conservative last-row exclusion; actual live opening was not observed'
            else:cutoff_basis='Operator/agent observed live-bar opening timestamp'
            historical=[i for i,t in enumerate(timestamps) if t<cutoff]
            index_title=rule.get('index_title');first=last=None;basis='UNVERIFIED';index_values=[]
            if index_title and (index_title,None) in by_key:
                index_values=[number(row[by_key[(index_title,None)]]) for row in rows]
                if all(math.isfinite(v) for v in index_values):first,last=index_values[0],index_values[-1];basis='Direct plotted '+index_title
            if not index_values and rule.get('index_relation'):
                rel=rule['index_relation'];h=by_key.get((rel['title'],None))
                if h:
                    index_values=[number(row[h])+rel['add'] for row in rows]
                    if all(math.isfinite(v) for v in index_values):first,last=index_values[0],index_values[-1];basis='Conditional getter witness: '+rel['title']+' '+str(rel['add'])+'; not an independent index control'
            if rule.get('seed_phase'):
                h=by_key.get(('input_seed_phase',None));phases=[number(row[h]) for row in rows] if h else []
                anchor=max(0,len(rows)-1-159)
                if phases and all(phases[i]==i-anchor for i in range(len(rows))):first,last=0,len(rows)-1;index_values=list(range(len(rows)));basis='Conditional full-reset phase anchor witness; independent dataset start unavailable'
                if not set(range(-5,101)).issubset(set(phases[i] for i in historical)):validation.append('Historical seed phases -5 through100 missing')
            complete=first==0 and last==len(rows)-1 and all(v==i for i,v in enumerate(index_values))
            if not complete:validation.append('Dataset beginning at Pine bar_index0 not demonstrated')
            if len(historical)<rule['minimum_history_rows']:validation.append('Insufficient historical rows')
            if note.get('chart_unchanged_attested') is not True:validation.append('Chart setup/reset unchanged attestation missing')
            for k in ['time','open','high','low','close']:
                if k not in input_columns:validation.append('Missing chart input '+k)
            if 'volume' not in input_columns and not rule['volume_unused_by_source']:validation.append('Missing volume input used by source')
            for c in rule['columns']:
                h=by_key.get((c['title'],c.get('channel')))
                if h and h not in headers:validation.append('Mapped header absent: '+h)
            lexemes=[s for row in rows for s in row.values() if re.fullmatch(r'[+-]?\d+\.\d+(?:[eE][+-]?\d+)?',s or '')]
            observed=max((len(s.split('.')[1].split('e')[0].split('E')[0]) for s in lexemes),default=0)
            inputs=note.get('input_changes',[])
            runtime=note.get('runtime')
            runtime_status=runtime.get('status') if isinstance(runtime,dict) else runtime
            if runtime_status!='RUNS':validation.append('Run status missing or not RUNS; failed/partial evidence is not FILE-READY')
            entry={'probe':probe,'source_path':source['path'],'csv_file':note['csv_file'],'attempt':note.get('attempt',1),'source_sha256':digest(a.bundle/source['path']),'source_identity_basis':'Staged source hash; operator pasted unchanged source per procedure','export_sha256':digest(file),'export_bytes':file.stat().st_size,'captured_at_utc':note.get('captured_at_utc'),'file_modified_at_utc':datetime.fromtimestamp(file.stat().st_mtime,timezone.utc).isoformat(),'processed_at_utc':datetime.now(timezone.utc).isoformat(),'reset_at_utc':note.get('reset_at_utc'),'observed_live_bar_open_utc':note.get('live_bar_open_utc'),'tickerid':'BINANCE:BTCUSDT','interval':'2m','chart_style':'standard candles','timezone':'Etc/UTC','chart_setup_basis':'Bundle setup; attested unchanged' if note.get('chart_unchanged_attested') else 'Planned setup; not attested','pine_precision':rule['pine_precision'],'export_max_fraction_digits_observed':observed,'precision_note':'Observed CSV lexemes, not a guarantee or comparison tolerance','csv_time_unit':unit,'columns':headers,'column_map':mappings,'input_columns':input_columns,'plotted_units':rule['units'],'row_count':len(rows),'first_bar_index':first,'last_bar_index':last,'index_basis':basis,'first_timestamp':timestamps[0],'last_timestamp':timestamps[-1],'timestamp_unit':'unix_seconds','historical_compare_before_unix_seconds':cutoff,'cutoff_basis':cutoff_basis,'historical_rows':len(historical),'minimum_history_rows':rule['minimum_history_rows'],'history_complete':complete,'volume_unused_by_source':rule['volume_unused_by_source'],'input_changes':inputs,'notes':note.get('notes',''),'evidence_paths':note.get('evidence_paths',[]),'validation_errors':validation,'status':'NEEDS-EVIDENCE' if validation else 'FILE-READY'}
            if runtime:entry['runtime']=runtime
            records.append(entry)
        except Exception as e:problems.append({'probe':probe,'csv_file':note['csv_file'],'error':str(e)})
    grouped={}
    for r in records:grouped.setdefault(r['probe'],[]).append(r)
    selected=[]
    for probe,group in grouped.items():
        chosen=[r for r in group if r['status']=='FILE-READY']
        if len(chosen)>1:problems.append({'probe':probe,'error':'Multiple FILE-READY attempts; set selected_attempt in notes to avoid silently choosing'})
        desired=raw.get('selected_attempts',{}).get(probe)
        if desired is not None:
            chosen=[r for r in group if r['attempt']==desired]
            if len(chosen)!=1:problems.append({'probe':probe,'error':'selected_attempt not unique'});continue
        if len(chosen)==1:selected.append(chosen[0])
        elif len(group)==1:selected.append(group[0])
    artifact={'artifact':'Derived capture manifest v2','captures':selected,'attempts':records,'errors':problems,'authority':'File derivation only; no parity assertion. Unknown observation fields remain null; conservative last-row cutoff is labelled.'}
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(artifact,indent=2,allow_nan=False)+'\n')
    print(json.dumps({'attempts':len(records),'selected':len(selected),'fileReady':sum(r['status']=='FILE-READY' for r in selected),'errors':len(problems),'output':str(a.output)}))
    return 1 if not records or problems or any(r['validation_errors'] for r in selected) else 0
if __name__=='__main__':sys.exit(main())
