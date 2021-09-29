const core = require('@actions/core');
const github = require('@actions/github');

function run() {
  const repoToken = core.getInput('repoToken');
  const octokit = github.getOctokit(repoToken);

  const config = {
    owner: 'hacker0limbo',
    repo: 'my-blog',
  };

  octokit.rest.issues
    .listForRepo({
      ...config,
    })
    .then((res) => {
      // { 2019: [{ title: xxx, url: xxx }, {...}], 2020: [...] }
      const issuesByYear = res.data.reduce((result, issue) => {
        const { created_at, title, url } = issue;
        const year = created_at.slice(0, 4);

        if (result.hasOwnProperty(year)) {
          result[year].push({ title, url });
        } else {
          result[year] = [{ title, url }];
        }
        return result;
      }, {});

      const content = Object.entries(issuesByYear).reduce((result, [year, info]) => {
        const titlesByYear = info.reduce((r, { title, url }) => r + `- [${title}](${url})\r\n`, '');
        result += `## ${year}\r\n${titlesByYear}`;
        return result;
      }, '# 个人博客\r\n');

      const filePath = { path: 'README.md' };

      octokit.rest.repos
        .getContent({
          ...config,
          ...filePath,
        })
        .then((res) => {
          // https://swizec.com/blog/using-javascript-to-commit-to-github-codewithswiz-7/
          // need to get sha before you update a file
          const { sha } = res.data;

          octokit.rest.repos
            .createOrUpdateFileContents({
              ...config,
              path: 'README.md',
              message: 'feat: update readme through github action',
              content,
              sha,
            })
            .then((res) => {
              core.info(
                `Successfully update and commit README.md, commit id: ${res.data.commit.sha}`
              );
            })
            .catch((error) => {
              core.setFailed(
                `Failed to update README.md with a status of ${error.status}, error: ${error.response.data.message}`
              );
            });
        })
        .catch((error) => {
          core.setFailed(
            `Failed to get file sha with a status of ${error.status}, error: ${error.response.data.message}`
          );    
        });
    })
    .catch((error) => {
      core.setFailed(
        `Failed to fetch issues with a status of ${error.status}, error: ${error.response.data.message}`
      );
    });
}

run();
