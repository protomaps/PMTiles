package main

import (
        "flag"
        "log"
        "net/http"
)

func main() {
    port := flag.String("p", "7000", "port to serve on")
    directory := flag.String("d", ".", "the directory containing PMTiles archives")
    flag.Parse()

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Headers", "Range")
        http.ServeFile(w, r, r.URL.Path[1:])
    })

    log.Printf("Serving %s on HTTP port: %s\n", *directory, *port)
    log.Fatal(http.ListenAndServe(":"+*port, nil))
}