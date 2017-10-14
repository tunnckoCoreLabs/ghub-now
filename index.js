const { readFileSync } = require('fs');
const { parse } = require('url');
const { send } = require('micro');
const isObject = require('isobject');
const redirect = require('micro-redirect');
const getRequestsOnly = require('micro-get');
const getPkg = require('get-pkg');
const parseGithub = require('parse-github-url');

module.exports = getRequestsOnly(async (req, res) => {
  const { pathname } = parse(req.url);

  if (pathname === '/') {
    return readFileSync('./home.html', 'utf8');
  }

  const name = pathname.slice(1);
  let pkg = null;

  try {
    pkg = await packageJson(name);
  } catch (e) {
    return redirect(res, 301, '/');
  }

  let url = pkg.repository || (pkg.bugs && pkg.bugs.url);

  if (isObject(url)) {
    url = url.url; // eslint-disable-line
  }
  if (!isString(url)) {
    return send(res, 404, 'Some problem appeared');
  }

  const { repo } = parseGithub(url);

  // TODO: Support for GitLab, BitBucket, etc? - Send a pull request.
  return redirect(res, 301, `https://github.com/${repo}`);
});

function packageJson (name) {
  return new Promise((resolve, reject) => {
    getPkg(name, (er, pkg) => {
      if (er) return reject(er);
      resolve(pkg);
    });
  });
}

function isString (url) {
  return url && typeof url === 'string';
}
