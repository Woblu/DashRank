import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function GuidelinesPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 text-white">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 mb-4">
          DashRank Benchmark List – Official Guidelines
        </h1>
        <p className="text-lg text-gray-300 max-w-3xl mx-auto">
          These guidelines establish the standards for submitting performance records and adding new challenges to the DashRank Benchmark List. The goal is to promote fairness, legitimacy, and consistency across all ranked entries.
        </p>
      </div>

      <hr className="border-gray-700" />

      {/* New Section */}
      <section className="my-12">
        <h2 className="text-3xl font-bold text-white mb-6 border-b border-gray-700 pb-2">Relationship to Community Lists</h2>
        <div className="space-y-4 text-gray-300">
          <p>
            <strong>DashRank is an independent project and is not affiliated with Pointercrate.</strong> While our rules are comprehensive, the <a href="https://www.pointercrate.com/guidelines/index" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Pointercrate guidelines</a> serve as the foundational standard for the community. In any situation not explicitly covered by our rules, their guidelines should be considered the default reference.
          </p>
          <p>
            Furthermore, for specific categories of challenges, DashRank recognizes the authority and specialized rulesets of other established community lists. Submissions to these categories must adhere to the guidelines of the respective list:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li>
              <strong>Unrated Demon List (UDL):</strong> <a href="https://udl.pages.dev/#/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">UDL Guidelines</a> 
            </li>
            <li>
              <strong>Platformer Demonlist (Pemonlist):</strong> <a href="https://pemonlist.com/rules" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Pemonlist Rules</a>
            </li>
            <li>
             <strong>Challenge List:</strong> <a href="https://docs.google.com/document/d/1_rtzUbfCGQY-j5AYGtnYwjcpYQ_G54jy_6sTHAcNENQ/edit?tab=t.0" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Challenge List Rules</a> 
            </li>
            <li>
              <strong>Speedhack Demon List (SDL):</strong> <a href="https://sdlpages.pro/#/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">SDL Guidelines</a>
            </li>
          </ul>
        </div>
      </section>

      <hr className="border-gray-700" />

      <div className="space-y-12 mt-12">
        {/* Section 1: Submission Requirements */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6 border-b border-gray-700 pb-2">1. Submission Requirements</h2>
          <p className="text-gray-400 mb-8">
            To be considered valid, all submissions must fully comply with the following criteria. Entries that don’t meet these standards will be disqualified.
          </p>

          <h3 className="text-2xl font-semibold text-cyan-400 mb-4">1.1 Video & Audio Evidence</h3>
          <ul className="list-disc list-inside space-y-3 text-gray-300">
            <li><strong>Unedited Recording:</strong> You must provide full, uncut footage of the successful attempt. The video should begin before your first input and end only after the final completion screen is shown. Edits, cuts, or splices are not allowed.</li>
            <li><strong>Clear Audio with Input Sounds:</strong> Your recording must include clear audio. Input sounds—such as clicks, taps, or keystrokes—need to be audible and properly synced with what’s happening on-screen. Recordings with just background music are not acceptable.</li>
            <li><strong>Visible Completion Screen:</strong> The in-game end screen (or any official indicator of success) must be clearly visible in the recording.</li>
          </ul>

          <h3 className="text-2xl font-semibold text-cyan-400 mt-8 mb-4">1.2 Performance & Technical Evidence</h3>
          <ul className="list-disc list-inside space-y-3 text-gray-300">
            <li><strong>FPS Display Required:</strong> A real-time FPS (frames per second) counter must be visible for the entire duration of the attempt. This helps confirm the technical conditions under which the performance was achieved.</li>
            <li><strong>No Obstruction:</strong> The video should be free of overlays or obstructions that block essential parts of the screen. Facecams or cosmetic overlays are fine as long as they don’t interfere with the verification process.</li>
          </ul>
        </section>

        <hr className="border-gray-700" />

        {/* Section 2: Challenge Eligibility */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6 border-b border-gray-700 pb-2">2. Challenge Eligibility & Placement</h2>
          <p className="text-gray-400 mb-8">
            Before a new challenge can be added to the list, it must meet the following standards as reviewed by the DashRank team.
          </p>
          <ul className="list-disc list-inside space-y-3 text-gray-300">
            <li><strong>Appropriate Difficulty & Length:</strong> The challenge must be clearly difficult enough to justify being ranked. Very short or overly simple challenges will not be accepted.</li>
            <li><strong>Legitimate Verification:</strong> The first completion must be done legitimately—either by the creator or someone chosen to verify it. This establishes that the challenge is realistically beatable.</li>
            <li><strong>Build Quality & Clarity:</strong> The project should be well-designed, reasonably polished, and free of major bugs. Visual clarity and presentation matter.</li>
            <li><strong>Original Content:</strong> Direct clones or minimally changed versions of existing benchmarks won’t be accepted. Submissions should show originality.</li>
          </ul>
        </section>

        <hr className="border-gray-700" />

        {/* Section 3: Technical Rules */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6 border-b border-gray-700 pb-2">3. Technical Rules & Fair Competition</h2>
           <p className="text-gray-400 mb-8">
            All completions must follow the rules below to ensure a level playing field.
          </p>
          <h3 className="text-2xl font-semibold text-cyan-400 mb-4">3.1 Permitted Modifications</h3>
          <ul className="list-disc list-inside space-y-3 text-gray-300">
             <li><strong>FPS Tools:</strong> Using frame rate tools is allowed, but only up to 360 FPS. If your FPS goes above this during the run, the submission will be rejected.</li>
             <li><strong>Cosmetic Mods:</strong> Visual changes like texture packs or UI tweaks are generally fine, as long as they don’t affect gameplay mechanics.</li>
          </ul>
           <h3 className="text-2xl font-semibold text-cyan-400 mt-8 mb-4">3.2 Banned Tools & Methods</h3>
           <ul className="list-disc list-inside space-y-3 text-gray-300">
             <li><strong>Gameplay-Altering Tools:</strong> Any tool or mod that changes the game’s physics, mechanics, or internal logic is not allowed.</li>
             <li><strong>Automation (Bots/Macros):</strong> The use of bots, macros, or any form of automated input is strictly forbidden and considered a serious offense.</li>
             <li><strong>Bug Abuse:</strong> Taking advantage of glitches or bugs to bypass sections of a challenge is not acceptable. You must complete the challenge as intended.</li>
          </ul>
        </section>

        <hr className="border-gray-700" />

        {/* Section 4: Integrity */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6 border-b border-gray-700 pb-2">4. Integrity and Rule Enforcement</h2>
           <p className="text-gray-400 mb-8">
            Maintaining the credibility of the DashRank list is a top priority. Any violation of the rules will be dealt with strictly.
          </p>
          <ul className="list-disc list-inside space-y-3 text-gray-300">
            <li><strong>What Counts as a Violation:</strong> This includes but isn’t limited to spliced videos, using automation tools, tampering with game mechanics, or submitting dishonest runs.</li>
            <li><strong>Penalties:</strong> If a user is caught submitting a fake or manipulated record, they will be permanently banned from submitting in the future. All of their previous records will be removed from the list.</li>
            <li><strong>Appeals:</strong> Banned users may file a single appeal. A supermajority vote from the DashRank Review Team is required to overturn a ban.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}