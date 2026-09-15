import { exec } from "ags/process";
import GLib from "gi://GLib";

function compileIfNeeded(source: string, output: string) {
  exec(
    `bash -c 'if [ ! -x "${output}" ] || [ "${source}" -nt "${output}" ]; then gcc -O2 "${source}" -o "${output}"; fi'`,
  );
}

export function compileBinaries() {
  const homeDir = GLib.get_home_dir();
  const tmpDir = `/tmp/ags`;
  const scriptsDir = `${homeDir}/.config/ags/scripts`;

  exec(`bash -c "mkdir -p ${tmpDir}"`);
  compileIfNeeded(
    `${scriptsDir}/bandwidth-loop-ags.c`,
    `${tmpDir}/bandwidth-loop-ags`,
  );
  compileIfNeeded(
    `${scriptsDir}/system-resources-loop-ags.c`,
    `${tmpDir}/system-resources-loop-ags`,
  );
  compileIfNeeded(
    `${scriptsDir}/keystroke-loop-ags.c`,
    `${tmpDir}/keystroke-loop-ags`,
  );
}
