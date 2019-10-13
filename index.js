const { readFileSync } = require('fs');
const url = require('url');
const { send } = require('micro');
const path = require('path');
const redirect = require('micro-redirect');
const getRequestsOnly = require('micro-get');
const packageJson = require('@tunnckocore/package-json');
const parseGithub = require('parse-github-url');

// eslint-disable-next-line max-statements
module.exports = getRequestsOnly(async (req, res) => {
  // eslint-disable-next-line node/no-deprecated-api
  const parsed = url.parse(req.url);

  if (parsed.pathname === '/') {
    return readFileSync('./home.html', 'utf8');
  }

  const parts = clean(parsed.pathname).split('/');
  let pkg = null;

  // @tunnckocore/package-json
  // @tunnckocore/package-json/<branch>
  // @tunnckocore/package-json@<tag|version>
  // @tunnckocore/package-json@<tag|version>/<branch>

  // get-pkg
  // get-pkg/<branch>
  // get-pkg@<tag|version>
  // get-pkg@<tag|version>/<branch>

  const name = parts.length >= 2 ? parts.slice(0, 2).join('/') : parts[0];
  const isScoped = name.startsWith('@');

  try {
    pkg = await packageJson(name);
  } catch (err) {
    console.error(err);
    return send(res, 404, `Package not found or loading error ${name}`);
  }

  const repoBranch = isScoped ? parts.slice(2) : parts.slice(1);
  const repository = (pkg.repository && pkg.repository.url) || pkg.repository;
  const directory = (pkg.repository && pkg.repository.directory) || '';
  const bugs = (pkg.bugs && pkg.bugs.url) || pkg.bugs;
  const repoBr = repoBranch.length > 0 ? repoBranch : ['master'];

  const branch = path.join(...repoBr);

  const dir = directory ? `/tree/${branch}/${clean(directory)}` : '';

  const pkgUrl = clean(repository ? repository.replace('.git', '') : bugs);

  if (pkgUrl) {
    const gh = parseGithub(`${pkgUrl}${dir}`);

    if (dir) {
      return redirect(res, 302, `https://${gh.host}/${gh.repo}${dir}`);
    }

    const pathname = gh.pathname.replace('.git', '');
    return redirect(res, 302, `https://${gh.host}/${pathname}`);
  }
  if (isString(pkg.homepage)) {
    return redirect(res, 302, pkg.homepage);
  }

  return redirect(res, 302, `https://npmjs.com/package/${name}`);
});

function isString(val) {
  return val && typeof val === 'string';
}

function clean(val) {
  return isString(val) ? val.replace(/^\/|\/$/, '') : val;
}
