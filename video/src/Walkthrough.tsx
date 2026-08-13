/**
 * Nullstamp — Terminal 3 ADK submission walkthrough.
 *
 * Every number, digest, and quoted line in this piece is taken from the real
 * testnet run recorded in submission/evidence/. Nothing is illustrative.
 */

import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {C, FONT, SCENES} from './theme';
import {Body, Check, Kicker, Mark, Panel, Rise, Stage, Title, Typed} from './parts';

const DIGEST = '8fb056c99bbea7e655d72075e37e428c8fbaade3c79b32fb737a6c4bef82e4d3';
const RECEIPT_ID = 'rcpt_8fb056c99bbea7e655d72075';
const TAMPERED = '9f2c28bea15b65b3c3507864989044b969ac7f750e0f36c8ed8a92e7e8f561ef';

/* ------------------------------------------------------------------ 1. Title */

const TitleScene: React.FC = () => (
  <Stage gap={34}>
    <Rise>
      <Mark size={78} />
    </Rise>
    <Rise delay={8}>
      <Title size={78}>
        Your agent touches
        <br />
        someone&rsquo;s personal data.
        <span style={{color: C.muted, display: 'block'}}>
          Prove exactly what it used.
        </span>
      </Title>
    </Rise>
    <Rise delay={20}>
      <div style={{fontFamily: FONT.mono, fontSize: 23, color: C.faint}}>
        Nullstamp &middot; a TEE contract on Terminal 3 &middot; live on T3N testnet
      </div>
    </Rise>
  </Stage>
);

/* ---------------------------------------------------------------- 2. Problem */

const ProblemScene: React.FC = () => (
  <Stage>
    <Rise>
      <Kicker>the deadlock</Kicker>
    </Rise>
    <Rise delay={6}>
      <Title size={50}>Audit trails are caught between two failures</Title>
    </Rise>

    <div style={{display: 'flex', gap: 26, marginTop: 14}}>
      <Rise delay={16} style={{flex: 1}}>
        <Panel accent={C.denied} style={{height: '100%'}}>
          <div style={{color: C.denied, fontSize: 19, letterSpacing: '0.12em'}}>
            KEEP EVERYTHING
          </div>
          <div
            style={{
              fontFamily: FONT.sans,
              fontSize: 26,
              color: C.ink,
              marginTop: 14,
              lineHeight: 1.45,
            }}
          >
            The log itself becomes a pile of personal data, and turns up as a finding
            in the next audit.
          </div>
        </Panel>
      </Rise>

      <Rise delay={28} style={{flex: 1}}>
        <Panel accent={C.pending} style={{height: '100%'}}>
          <div style={{color: C.pending, fontSize: 19, letterSpacing: '0.12em'}}>
            REDACT IT
          </div>
          <div
            style={{
              fontFamily: FONT.sans,
              fontSize: 26,
              color: C.ink,
              marginTop: 14,
              lineHeight: 1.45,
            }}
          >
            What remains cannot prove the trail is intact, so it never answers the
            question actually being asked.
          </div>
        </Panel>
      </Rise>
    </div>

    <Rise delay={42}>
      <Body>
        EU AI Act Article 12 record-keeping lands in August 2026. GDPR requires data
        subjects to know which fields were used. Those two demands fight each other
        &mdash; for as long as the record is built the ordinary way.
      </Body>
    </Rise>
  </Stage>
);

/* -------------------------------------------------------------- 3. Mechanism */

const Box: React.FC<{label: string; sub: string; accent?: string}> = ({
  label,
  sub,
  accent = C.line,
}) => (
  <div
    style={{
      border: `2px solid ${accent}`,
      background: C.surface,
      borderRadius: 10,
      padding: '18px 22px',
      minWidth: 250,
    }}
  >
    <div style={{fontFamily: FONT.sans, fontSize: 25, color: C.ink, fontWeight: 500}}>
      {label}
    </div>
    <div style={{fontFamily: FONT.mono, fontSize: 18, color: C.faint, marginTop: 5}}>
      {sub}
    </div>
  </div>
);

const Arrow: React.FC<{delay: number; label?: string}> = ({delay, label}) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame - delay, [0, 14], [0, 74], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
      {label && (
        <div style={{fontFamily: FONT.mono, fontSize: 16, color: C.seal, opacity: w / 74}}>
          {label}
        </div>
      )}
      <div style={{width: 74, height: 2, background: C.line, position: 'relative'}}>
        <div style={{width: w, height: 2, background: C.seal}} />
      </div>
    </div>
  );
};

const MechanismScene: React.FC = () => (
  <Stage>
    <Rise>
      <Kicker>how it works</Kicker>
    </Rise>
    <Rise delay={6}>
      <Title size={50}>The contract never receives the values</Title>
    </Rise>

    <Rise delay={16} style={{marginTop: 10}}>
      <div
        style={{
          border: `2px dashed ${C.seal}`,
          borderRadius: 14,
          padding: '30px 26px 22px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -14,
            left: 24,
            background: C.bg,
            padding: '0 10px',
            fontFamily: FONT.mono,
            fontSize: 17,
            color: C.seal,
            letterSpacing: '0.1em',
          }}
        >
          TEE ENCLAVE BOUNDARY
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          <Box label="Contract" sub="{{profile.first_name}}" />
          <Arrow delay={30} label="markers only" />
          <Box label="Host substitution" sub="http-with-placeholders" accent={C.seal} />
          <Arrow delay={50} label="values filled in" />
          <Box label="Third party" sub="host on the grant" />
        </div>
      </div>
    </Rise>

    <Rise delay={68}>
      <Body>
        The host substitutes markers after the contract has finished assembling the
        request. So the contract is not promising not to store those values. It never
        holds them.
      </Body>
    </Rise>
  </Stage>
);

/* ---------------------------------------------------------------- 4. Receipt */

const ReceiptScene: React.FC = () => (
  <Stage>
    <Rise>
      <Kicker>live on testnet</Kicker>
    </Rise>
    <Rise delay={6}>
      <Title size={50}>A receipt issued inside the enclave</Title>
    </Rise>

    <Rise delay={16}>
      <Panel style={{marginTop: 6}}>
        <div style={{color: C.faint, fontSize: 18, letterSpacing: '0.1em', marginBottom: 12}}>
          CORE &mdash; FIELD NAMES ONLY, NEVER VALUES
        </div>
        {[
          ['fields_used', '["first_name", "last_name"]'],
          ['target_host', '"postman-echo.com"'],
          ['response_code', '200'],
          ['contract_id', '639'],
          ['seq_no', '114186   ← cluster clock, not my machine'],
        ].map(([k, v], i) => (
          <Rise key={k} delay={26 + i * 7}>
            <div style={{display: 'flex', gap: 12}}>
              <span style={{color: C.seal, width: 250, display: 'inline-block'}}>{k}</span>
              <span style={{color: C.ink}}>{v}</span>
            </div>
          </Rise>
        ))}
      </Panel>
    </Rise>

    <Rise delay={80}>
      <div style={{display: 'flex', gap: 12, alignItems: 'baseline'}}>
        <span style={{fontFamily: FONT.mono, fontSize: 21, color: C.faint, width: 250}}>
          digest_sha256
        </span>
        <Typed text={DIGEST} delay={92} perChar={0.9} color={C.verified} size={21} />
      </div>
    </Rise>

    <Rise delay={150}>
      <Body>
        The values are absent and cannot be present, because the code that assembles
        this section never receives them.
      </Body>
    </Rise>
  </Stage>
);

/* ---------------------------------------------------------------- 5. Offline */

const OfflineScene: React.FC = () => (
  <Stage>
    <Rise>
      <Kicker>the central claim</Kicker>
    </Rise>
    <Rise delay={6}>
      <Title size={50}>Anyone can recompute it, outside the node</Title>
    </Rise>

    <Rise delay={16}>
      <Panel accent={C.verified} style={{marginTop: 6}}>
        <div style={{color: C.faint, fontSize: 19, marginBottom: 14}}>
          $ npm run verify:offline &mdash;&mdash; ../submission/live-receipt.json
        </div>
        <div style={{display: 'flex', gap: 12}}>
          <span style={{color: C.faint, width: 220, display: 'inline-block'}}>
            digest recorded
          </span>
          <span style={{color: C.ink, fontSize: 20}}>{DIGEST}</span>
        </div>
        <div style={{display: 'flex', gap: 12, marginTop: 4}}>
          <span style={{color: C.faint, width: 220, display: 'inline-block'}}>
            digest computed
          </span>
          <Typed text={DIGEST} delay={40} perChar={0.9} color={C.verified} size={20} />
        </div>
        <Rise delay={110} style={{marginTop: 20}}>
          <div style={{color: C.verified, fontSize: 26, fontFamily: FONT.sans}}>
            RESULT: valid. Digest recomputed outside the node and it matches.
          </div>
        </Rise>
      </Panel>
    </Rise>

    <Rise delay={130}>
      <Body>
        No SDK. No session. No network request. And the tenant account is at zero
        credits &mdash; the node will not answer us any more, yet the receipt still
        checks out.
      </Body>
    </Rise>
  </Stage>
);

/* ----------------------------------------------------------------- 6. Tamper */

const TamperScene: React.FC = () => (
  <Stage>
    <Rise>
      <Kicker>the reverse direction</Kicker>
    </Rise>
    <Rise delay={6}>
      <Title size={50}>Claiming less than you touched is caught</Title>
    </Rise>

    <Rise delay={16}>
      <Panel accent={C.denied} style={{marginTop: 6}}>
        <div style={{color: C.denied, fontSize: 22, marginBottom: 16, fontFamily: FONT.sans}}>
          fields_used cut from two entries to one
        </div>
        <Check
          label="Core layer"
          detail="— present"
          ok
          delay={30}
        />
        <Check
          label="Digest"
          detail={`— mismatch — computed ${TAMPERED.slice(0, 20)}…`}
          ok={false}
          delay={44}
        />
        <Check
          label="Identity"
          detail="— does not derive from digest"
          ok={false}
          delay={58}
        />
        <Rise delay={76} style={{marginTop: 18}}>
          <div style={{fontFamily: FONT.mono, fontSize: 22, color: C.denied}}>
            RESULT: invalid. &nbsp;exit 1
          </div>
        </Rise>
      </Panel>
    </Rise>

    <Rise delay={100}>
      <Body>
        Editing the content and then repairing the digest so it agrees does not help
        either. The receipt identity derives from the digest, so it cannot be repaired
        without becoming a different identity.
      </Body>
    </Rise>
  </Stage>
);

/* --------------------------------------------------------------- 7. Findings */

const FINDINGS: Array<[string, string, boolean]> = [
  ['T-12', 'Importing signing@2.1.0 stops the contract instantiating — opaque 500, empty log', true],
  ['T-11', 'tenant.claim() returns 500 on a tenant the SSO page already provisioned', true],
  ['T-13', 'Contract ids are per registration; map ACLs bind to the id and silently break', true],
  ['T-14', 'kv-store.scan returns raw T3VR CAS pointers where get resolves them', true],
  ['T-15', '20,000 credit grant exhausted by ten registrations', true],
  ['T-01', 'The first Quickstart sample cannot run: trustAnchor throws in the constructor', false],
];

const FindingsScene: React.FC = () => (
  <Stage>
    <Rise>
      <Kicker>bug report</Kicker>
    </Rise>
    <Rise delay={6}>
      <Title size={50}>
        Fifteen findings, five of them blockers
      </Title>
    </Rise>
    <Rise delay={12}>
      <Body width={980}>
        Five surfaced only by running a contract against the live network. None of those
        are discoverable from the documentation.
      </Body>
    </Rise>

    <div style={{display: 'flex', flexDirection: 'column', gap: 11, marginTop: 8}}>
      {FINDINGS.map(([id, text, testnet], i) => (
        <Rise key={id} delay={22 + i * 11}>
          <div style={{display: 'flex', gap: 16, alignItems: 'baseline'}}>
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: 22,
                color: C.seal,
                width: 66,
                display: 'inline-block',
              }}
            >
              {id}
            </span>
            <span style={{fontFamily: FONT.sans, fontSize: 24, color: C.ink, flex: 1}}>
              {text}
            </span>
            {testnet && (
              <span
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 15,
                  color: C.seal,
                  border: `1px solid ${C.seal}`,
                  borderRadius: 20,
                  padding: '2px 10px',
                  whiteSpace: 'nowrap',
                }}
              >
                from testnet
              </span>
            )}
          </div>
        </Rise>
      ))}
    </div>
  </Stage>
);

/* ------------------------------------------------------------------ 8. Close */

const CloseScene: React.FC = () => (
  <Stage gap={26}>
    <Rise>
      <Mark size={66} />
    </Rise>
    <Rise delay={8}>
      <Title size={56}>Compute it yourself, then compare</Title>
    </Rise>
    <Rise delay={18}>
      <div style={{fontFamily: FONT.mono, fontSize: 26, color: C.muted, lineHeight: 1.9}}>
        <div>nullstamp.vercel.app/verify</div>
        <div>github.com/bryankwandou/nullstamp</div>
      </div>
    </Rise>
    <Rise delay={30}>
      <div style={{fontFamily: FONT.mono, fontSize: 20, color: C.faint}}>
        {RECEIPT_ID} &middot; contract 639 &middot; T3N testnet
      </div>
    </Rise>
  </Stage>
);

/* ---------------------------------------------------------------- Composition */

export const Walkthrough: React.FC = () => {
  const scenes: Array<[keyof typeof SCENES, React.FC]> = [
    ['title', TitleScene],
    ['problem', ProblemScene],
    ['mechanism', MechanismScene],
    ['receipt', ReceiptScene],
    ['offline', OfflineScene],
    ['tamper', TamperScene],
    ['findings', FindingsScene],
    ['close', CloseScene],
  ];

  return (
    <AbsoluteFill style={{background: C.bg}}>
      {scenes.map(([key, Scene]) => (
        <Sequence key={key} from={SCENES[key].from} durationInFrames={SCENES[key].dur}>
          <Scene />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
