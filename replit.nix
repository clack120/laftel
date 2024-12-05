{ pkgs }: {
    deps = [
      pkgs.bento4
      pkgs.aria2
      pkgs.ffmpeg-full
      pkgs.yt-dlp
      pkgs.gh
        pkgs.unixtools.netstat
        pkgs.deno
    ];
}