# Three environments: kraken 5.3 pins torch 2.4 and transformers 4.57, the MLX
# vision-language models need transformers 5, and PP-OCRv6 needs kraken 7.
TROCR := .venv-trocr/bin/python
VLM := .venv-vlm/bin/python
KRAKEN7 := .venv-kraken7/bin/python
SYSTEM ?= mccatmus
SET ?= quick

# The environment of each system; the others run in .venv-trocr.
PY_ppocrv6 := $(KRAKEN7)
PY_ppocrv6-ft := $(KRAKEN7)
PY_medusa-9b := $(VLM)
PYTHON = $(or $(PY_$(SYSTEM)),$(TROCR))

.PHONY: install format check run candidates baselines

install:
	uv venv --python 3.12 .venv-trocr
	uv pip install --python $(TROCR) --index-strategy unsafe-best-match -r requirements-trocr.txt
	uv venv --python 3.12 .venv-vlm
	uv pip install --python $(VLM) -r requirements-vlm.txt
	uv venv --python 3.12 .venv-kraken7
	uv pip install --python $(KRAKEN7) -r requirements-kraken7.txt

format:
	$(TROCR) -m ruff format .
	$(TROCR) -m ruff check --fix .

check:
	$(TROCR) -m ruff format --check .
	$(TROCR) -m ruff check .
	$(TROCR) -m pytest

# Run a candidate and write its report, e.g. make run SYSTEM=trocr SET=full
run:
	$(PYTHON) -m bench run $(SYSTEM) --set $(SET)

# medusa-9b reads the lines of the latest ppocrv6 run, so ppocrv6 comes first.
candidates:
	for system in trocr mccatmus lid-mccatmus; do $(TROCR) -m bench run $$system --set $(SET); done
	$(KRAKEN7) -m bench run ppocrv6 --set $(SET)
	$(VLM) -m bench run medusa-9b --set $(SET)

# Once per page set (~45 min for quick, ~6.5 h for full on an M5); resumes where it stopped.
baselines:
	$(VLM) -m bench run qwen3.5-9b --set $(SET)
	$(VLM) -m bench run churro-3b --set $(SET)
