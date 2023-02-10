import Docker from 'dockerode'

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

async function run() {
  const containers = await docker.listContainers();
  console.log(JSON.stringify(containers, null, 2));
  const container = docker.getContainer(containers[0].Id);
  const containerData = await container.inspect();
  console.log(containerData);
  // const containerLogs = container.logs();
  // console.log(containerLogs);
}

run().catch(console.error)
