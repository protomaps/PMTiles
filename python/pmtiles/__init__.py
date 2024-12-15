# SPDX-FileCopyrightText: 2021 Protomaps LLC
#
# SPDX-License-Identifier: BSD-3-Clause

from collections import namedtuple

Entry = namedtuple("Entry", ["z", "x", "y", "offset", "length", "is_dir"])
