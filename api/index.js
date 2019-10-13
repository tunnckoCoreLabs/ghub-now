const url = require('url');
const path = require('path');
const packageJson = require('get-pkg');
const parseGithub = require('parse-github-url');

function redirect(res, statusCode, location) {
  res.status(statusCode);
  res.setHeader('Location', location);
  res.end();
}

// eslint-disable-next-line max-statements
module.exports = async (req, res) => {
  const ALLOWED_HTTP_METHOD = 'GET';
  res.setHeader('Access-Control-Request-Method', ALLOWED_HTTP_METHOD);

  if (req.method !== ALLOWED_HTTP_METHOD) {
    res.status(405);
    res.send('Method Not Allowed');
    return;
  }

  // eslint-disable-next-line node/no-deprecated-api
  const parsed = url.parse(req.url);

  if (parsed.pathname === '/') {
    // const index = fs.readFileSync(path.join(__dirname, 'home.html'), 'utf8');
    // res.setHeader('content-type', 'text/html');
    // res.status(200);
    // res.send(index);
    redirect(res, 301, 'https://ghub.now.sh');
    return;
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
    redirect(res, 404, `Package not found or loading error ${name}`);
    return;
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
      redirect(res, 302, `https://${gh.host}/${gh.repo}${dir}`);
      return;
    }

    const pathname = gh.pathname.replace('.git', '');
    redirect(res, 302, `https://${gh.host}/${pathname}`);
    return;
  }
  if (isString(pkg.homepage)) {
    redirect(res, 302, pkg.homepage);
    return;
  }

  redirect(res, 302, `https://npmjs.com/package/${name}`);
};

function isString(val) {
  return val && typeof val === 'string';
}

function clean(val) {
  return isString(val) ? val.replace(/^\/|\/$/, '') : val;
}
