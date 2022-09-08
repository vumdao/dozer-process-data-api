FROM rust:1 as builder

RUN USER=root cargo new --bin data-processor

WORKDIR /data-processor

ADD Cargo.toml ./Cargo.toml

RUN cargo build --release && \
    rm src/*.rs && \
    rm -r ./target/release/deps/data_processor_sample*

ADD src ./src

RUN cargo build --release

ENV USER=rust \
    GROUP=rust

RUN addgroup --system ${GROUP} && \
    adduser --system --group ${USER} && \
    chown -R ${USER}:${GROUP} /data-processor

FROM rust:1

COPY --from=builder /data-processor/target/release/data-processor-sample /data-processor-sample
COPY --from=builder /etc/passwd /etc/passwd

USER rust

ENTRYPOINT ["/data-processor-sample"]