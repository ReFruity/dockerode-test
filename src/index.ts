import Docker, { HostConfig } from 'dockerode'

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

async function info() {
  const containers = await docker.listContainers();
  console.log(JSON.stringify(containers, null, 2));

  if (containers.length === 0) {
    return;
  }

  const container = docker.getContainer(containers[0].Id);
  const containerData = await container.inspect();
  console.log(containerData);
  const logsStream = await container.logs({
    timestamps: true,
    stdout: true,
    stderr: true,
    tail: 1,
    follow: true,
  });
  // console.log(containerLogs.toString());
  logsStream.on(
      'data',
      (logBuffer: Buffer) => console.log(logBuffer.toString()),
  );
}

async function startEchoServer() {
  const config: HostConfig = {
    PortBindings: { '80/tcp': [
        { HostIp: '::', HostPort: '3000' },
        { HostIp: '0.0.0.0', HostPort: '3000' },
    ] }
  };
  const container = await docker.createContainer({
    Image: 'ealen/echo-server',
    AttachStdin: false,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
    HostConfig: config,
    ExposedPorts: { '80/tcp': {} },
  });
  console.log(JSON.stringify(container, null, 2));
  const startResult = await container.start();
  console.log('Started echo server', startResult.toString());
  // const stream = await container.attach(
  //     {
  //       stream: true,
  //       stdout: true,
  //       stderr: true,
  //     }
  // );
  // stream.pipe(process.stdout);
}

async function stopAndRemoveEchoServers() {
  const containerInfos = await docker.listContainers({ all: true });
  const echoServerInfos = containerInfos.filter((containerInfo) => containerInfo.Image === 'ealen/echo-server')
  for (const echoServerInfo of echoServerInfos) {
    const echoServer = docker.getContainer(echoServerInfo.Id);
    if (echoServerInfo.State === 'running') {
      await echoServer.stop();
    }
    await echoServer.remove();
  }
  console.log(`Stopped and removed ${echoServerInfos.length} echo servers.`)
}

async function exec() {
  const containerInfos = await docker.listContainers();
  const echoServerInfos = containerInfos.filter((containerInfo) => containerInfo.Image === 'ealen/echo-server')
  const echoServerInfo = echoServerInfos[0];
  const echoServer = docker.getContainer(echoServerInfo.Id);
  const exec = await echoServer.exec({
    AttachStdout: true,
    Cmd: ['ls'],
  });
  const stream = await exec.start({});
  docker.modem.demuxStream(stream, process.stdout, process.stderr);
  console.log('Successfully executed command');
}

async function run() {
  await info();
  await stopAndRemoveEchoServers();
  await startEchoServer();
  await exec();
}

run().catch(console.error)
